import path from "path"
import fs from "fs"
import Listr from "listr"
import jpeg from "jpeg-js"

import { mkdirAsync, writeFileAsync, readDirRecursiveAsync, execFileAsync, accessAsync, readFileAsync, hasExtension, rmAsync } from "./file-utils.js"
import { zipBin, unzipBin, magickBin } from "./config.js"
import { cssFile } from "./templates/css.js"
import { metainfFile } from "./templates/metainf.js"
import { mimetypeFile } from "./templates/mimetype.js"
import { pageFile } from "./templates/page.js"
import { contentCSSItem, contentFile, contentImageItem, contentFileItem, contentItemref } from "./templates/content.js"
import { getName, fillZeroes } from "./utils.js"
import { CliOptions, CutArea } from "./cli.js"
import { calculateTopAndBottomBorder } from "./borders.js"
import { execProcessInParallelAsync } from "./worker.js"
import { MixedString } from "./mixedstring.js"

interface DocPaths {
    root: string
    metainf: string
    text: string
    styles: string
    images: string
    unzip: string
}

interface TaskContext {
    images: string[]
}

const INDEX_SIZE = 5

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
        const indexString = fillZeroes(`${index}`, INDEX_SIZE)
        const page = makePage(`Page ${indexString}`, imgpath, image)
        const pageFile = `page_${indexString}.xhtml`
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

async function readImageAsync(filename: string) {
    const fileImage = await readFileAsync(filename)
    return jpeg.decode(fileImage)
}

async function calculateBordersAsync(source: string, files: string[], cli: CliOptions): Promise<CutArea> {
    if (!cli.autoCut) return cli.cutArea

    const page = cli.page > 1 ? cli.page - 1 : 0
    const srcImage = await readImageAsync(path.join(source, files[page]));
    const [borderTop, borderBottom] = calculateTopAndBottomBorder(srcImage, { threshold: cli.threshold })

    return {
        top: borderTop,
        right: 0,
        bottom: borderBottom,
        left: 0
    }
}

async function processImagesAsync(source: string, dest: string, cli: CliOptions): Promise<string[]> {
    function makeFileName(name: string, index: number): string {
        const p = path.parse(name)
        return fillZeroes(`${index}`, INDEX_SIZE) + `${p.ext}`
    }
    function createArgs(index: number, name: string, cutArea: CutArea) {
        const n = makeFileName(name, index)
        const args: string[] = []
        args.push(path.join(source, name))
        if (cutArea.top != 0 || cutArea.top != 0) args.push("-chop", `${cutArea.left}x${cutArea.top}`)
        if (cutArea.right) args.push("-gravity", "East", "-chop", `${cutArea.right}x0`)
        if (cutArea.bottom) args.push("-gravity", "South", "-chop", `0x${cutArea.bottom}`)
        if (cli.resize.width != 0 && cli.resize.height != 0) args.push("-resize", `${cli.resize.width}x${cli.resize.height}`)
        args.push("-quality", `${cli.quality}`)
        args.push(path.join(dest, n))
        return args
    }

    const files = await readDirRecursiveAsync(source)
    const imageFiles = files.filter(name => hasExtension(name, ".jpg"))

    const mixedStrings = imageFiles.map(filename => MixedString.parse(filename))
    mixedStrings.sort(MixedString.compare)

    const sortedStrings = mixedStrings.map(ms => ms.asString())

    const cutArea = await calculateBordersAsync(source, sortedStrings, cli)

    const argsList = sortedStrings.map((name, index) => createArgs(index, name, cutArea))
    await execProcessInParallelAsync(magickBin, argsList, cli)

    return sortedStrings.map((name, index) => makeFileName(name, index))
}

async function unzipFilesAsync(options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    if (options.cli.inputFile) {
        await execFileAsync(unzipBin, [options.cli.inputFile, "-d", options.path.unzip])
    }
}

async function zipFilesAsync(options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    const currentDir = process.cwd()
    const fileName = path.join(currentDir, `${getName(options.cli)}.epub`)
    const fileExists = await accessAsync(fileName, fs.constants.R_OK)
    if (fileExists) await fs.promises.unlink(fileName)
    process.chdir(options.path.root)
    await execFileAsync(zipBin, ["-r", fileName, "."])
    process.chdir(currentDir)
}

async function prepareInputFilesAsync(options: { cli: CliOptions, path: DocPaths }): Promise<string[]> {
    if (options.cli.inputFile) {
        return await processImagesAsync(options.path.unzip, options.path.images, options.cli)
    }
    if (options.cli.inputDir) {
        return await processImagesAsync(options.cli.inputDir, options.path.images, options.cli)
    }
    return []
}

async function generateEpubFilesAsync(images: string[], options: { cli: CliOptions, path: DocPaths }): Promise<void> {
    await writeStylesAsync(options)
    await writeMetainfAsync(options)
    await writeMimetypeAsync(options)
    const pages = await writePagesAsync(images, options)
    await writeContentFileAsync(images, pages, options)
}

export async function buildDocumentAsync(options: { cli: CliOptions, buildDir: string }): Promise<void> {
    //let images: string[] = []
    const docOptions = {
        ...options,
        path: createDocPaths(options.buildDir)
    }

    const tasks = new Listr<TaskContext>([
        {
            title: "creating directories",
            task: async () => await createDirectoriesAsync(docOptions.path)
        },
        {
            title: "decompresing",
            skip: () => !options.cli.inputFile,
            task: async () => await unzipFilesAsync(docOptions)
        },
        {
            title: "processing images",
            task: async (ctx) => ctx.images = await prepareInputFilesAsync(docOptions)
        },
        {
            title: "generating files",
            task: async (ctx) => await generateEpubFilesAsync(ctx.images, docOptions)
        },
        {
            title: "compressing epub",
            task: async () => await zipFilesAsync(docOptions)
        },
        {
            title: "removig temp directory",
            skip: () => options.cli.keepTemp,
            task: async() => await rmAsync(options.buildDir, { recursive: true })
        }
    ])

    await tasks.run()
}