import path from "path"
import fs from "fs"
import Listr from "listr"

import { mkdirAsync, writeFileAsync, readDirRecursiveAsync, execFileAsync, accessAsync } from "./file-utils"
import { magickBin, zipBin, unzipBin } from "./config"
import { cssFile } from "./templates/css"
import { metainfFile } from "./templates/metainf"
import { mimetypeFile } from "./templates/mimetype"
import { pageFile } from "./templates/page"
import { contentCSSItem, contentFile, contentImageItem, contentFileItem, contentItemref } from "./templates/content"
import { getName } from "./utils"
import { CliOptions } from "./cli"

interface DocPaths {
    root: string
    metainf: string
    text: string
    styles: string
    images: string
    unzip: string
}

function createDocPaths(buildDir: string): DocPaths {
    return {
        root: path.join(buildDir, "epub"),
        metainf: path.join(buildDir, "epub", "META-INF"),
        text: path.join(buildDir, "epub", "Text"),
        styles: path.join(buildDir, "epub", "Styles"),
        images: path.join(buildDir, "epub", "Images"),
        unzip: path.join(buildDir, "unzip"),
    }
}

async function createDirectoriesAsync(docPaths: DocPaths): Promise<void> {
    for (const p of Object.values(docPaths)) {
        await mkdirAsync(p)
    }
}

async function writeStylesAsync(options: { path: { styles: string }}): Promise<void> {
    await writeFileAsync(path.join(options.path.styles, "main.css"), cssFile)
}

async function writeMetainfAsync(options: { path: { metainf: string }}): Promise<void> {
    await writeFileAsync(path.join(options.path.metainf, "container.xml"), metainfFile)
}

async function writeMimetypeAsync(options: { path: { root: string }}): Promise<void> {
    await writeFileAsync(path.join(options.path.root, "mimetype"), mimetypeFile)
}

async function writePagesAsync(images: string[], options: { path: { images: string, text: string }}): Promise<string[]> {
    function makePage(title: string, imgpath: string, image: string): string {
        return pageFile
                .replace("__TITLE__", title)
                .replace("__SRCIMAGE__", path.join(imgpath, image))
    }
    const imgpath = path.relative(options.path.text, options.path.images)

    const pages: string[] = []
    for (const [index, image] of images.entries()) {
        const page = makePage(`Page ${index}`, imgpath, image)
        const pageFile = `page_${index}.xhtml`
        pages.push(pageFile)
        await writeFileAsync(path.join(options.path.text, pageFile), page)
    }
    return pages
}

async function writeContentFileAsync(images: string[], pages: string[], options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    function makeCSSItem(id: number): string {
        return contentCSSItem
            .replace("__ID__", `id${id}`)
            .replace("__FILE__", path.join(path.relative(options.path.root, options.path.styles), "main.css"))

    }
    function makeImageItem(id: number, image: string): string {
        return contentImageItem
            .replace("__ID__", `id${id}`)
            .replace("__FILE__", path.join(path.relative(options.path.root, options.path.images), image))

    }
    function makeFileItem(id: number, page: string): string {
        return contentFileItem
            .replace("__ID__", `id${id}`)
            .replace("__FILE__", path.join(path.relative(options.path.root, options.path.text), page))

    }
    function makeItemref(id: number): string {
        return contentItemref.replace("__ID__", `id${id}`)
    }

    let index = 0
    const items: string[] = []
    const spines: string[] = []

    for (const page of pages) {
        items.push(makeFileItem(index, page))
        spines.push(makeItemref(index))
        index++
    }

    items.push(makeCSSItem(index))
    index++

    for (const image of images) {
        items.push(makeImageItem(index, image))
        index++
    }

    const content = contentFile
        .replace("__TITLE__", getName(options.cli))
        .replace("__MANIFEST_ITEMS__", items.join("\n"))
        .replace("__SPINE_ITEMS__", spines.join("\n"))

    await writeFileAsync(path.join(options.path.root, "content.opf"), content)
}

async function magickCopyAsync(source: string, dest: string, cli: CliOptions): Promise<string[]> {
    function createArgs(index: number, name: string) {
        const p = path.parse(name)
        const n = `${index}${p.ext}`
        const args: string[] = []
        args.push(path.join(source, name))
        if (cli.cutArea.top != 0 || cli.cutArea.top != 0) args.push("-chop", `${cli.cutArea.left}x${cli.cutArea.top}`)
        if (cli.cutArea.right) args.push("-gravity", "East", "-chop", `${cli.cutArea.right}x0`)
        if (cli.cutArea.bottom) args.push("-gravity", "South", "-chop", `0x${cli.cutArea.bottom}`)
        if (cli.resize.width != 0 && cli.resize.height != 0) args.push("-resize", `${cli.resize.width}x${cli.resize.height}`)
        args.push(path.join(dest, n))
        return args
    }
    const files = await readDirRecursiveAsync(source)

    files.sort((a, b) => {
        if (a.length < b.length) return -1
        if (a.length > b.length) return 1
        if (a < b) return -1
        if (a > b) return 1
        return 0
    })

    const newNames: string[] = []
    let index = 0
    for (const name of files) {
        const p = path.parse(name)
        const n = `${index}${p.ext}`
        if (p.ext.toLocaleLowerCase() === ".jpg") {
            newNames.push(n)
            await execFileAsync(magickBin, createArgs(index, name))
            index++
        }
    }
    return newNames
}

async function unzipFiles(options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    if (options.cli.inputFile) {
        await execFileAsync(unzipBin, [options.cli.inputFile, "-d", options.path.unzip])
    } else {
        throw new Error(`File ${options.cli.inputFile} doesn't exists`)
    }
}

async function zipFiles(options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    const currentDir = process.cwd()
    const fileName = path.join(currentDir, `${getName(options.cli)}.epub`)
    const fileExists = await accessAsync(fileName, fs.constants.R_OK)
    if (fileExists) await fs.promises.unlink(fileName)
    process.chdir(options.path.root)
    await execFileAsync(zipBin, ["-r", fileName, "."])
    process.chdir(currentDir)
}

export async function prepareInputFiles(options: { cli: CliOptions, path: DocPaths }): Promise<string[]> {
    let images: string[] = []
    if (options.cli.inputFile) {
        await unzipFiles(options)
        images = await magickCopyAsync(options.path.unzip, options.path.images, options.cli)
    } else if (options.cli.inputDir) {
        images = await magickCopyAsync(options.cli.inputDir, options.path.images, options.cli)
    }
    return images
}

export async function buildDocumentAsync(options: { cli: CliOptions, buildDir: string }): Promise<void> {
    let images: string[] = []
    const docOptions = {
        ...options,
        path: createDocPaths(options.buildDir)
    }

    const tasks = new Listr([
        { title: "creating directories", task: () =>
            createDirectoriesAsync(docOptions.path)
        },
        { title: "processing input files", task: async () =>
            images = await prepareInputFiles(docOptions)
        },
        { title: "generating files", task: async () => {
            await writeStylesAsync(docOptions)
            await writeMetainfAsync(docOptions)
            await writeMimetypeAsync(docOptions)
            const pages = await writePagesAsync(images, docOptions)
            await writeContentFileAsync(images, pages, docOptions)
        }},
        { title: "compressing epub", task: () =>
            zipFiles(docOptions)
        }
    ])

    await tasks.run()
}