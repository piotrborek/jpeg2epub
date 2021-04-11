import fs from "fs"
import os from "os"
import path from "path"
import util from "util"
import child_process from "child_process"

export function accessAsync(path: string, mode: number): Promise<boolean> {
    return new Promise((resolve) => {
        fs.access(path, mode, (err) => {
            if (err) resolve(false);
            else resolve(true)
        })
    })
}

export function mkdirAsync(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, { recursive: true }, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })
}

export function mkTempDirAsync(prefix: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`), (err, dir) => {
            if (err) reject(err)
            else resolve(dir)
        })
    })
}

export function readDirAsync(path: string): Promise<fs.Dirent[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(path, { withFileTypes: true }, (err, files) => {
            if (err) reject(err)
            else resolve(files)
        })
    })
}

export async function readDirRecursiveAsync(pathString: string): Promise<string[]> {
    async function listFiles(dirent: string[], p: string) {
        const files = await readDirAsync(p)
        for (const file of files) {
            if (file.isFile()) {
                dirent.push(path.relative(pathString, path.join(p, file.name)))
            }
            if (file.isDirectory()) await listFiles(dirent, path.join(p, file.name))
        }
    }
    const dirent: string[] = []
    await listFiles(dirent, pathString)

    return dirent
}

export function hasExtension(name: string, ext: string): boolean {
    const p = path.parse(name)
    return p.ext.toLocaleLowerCase() === ext
}

export const execFileAsync = util.promisify(child_process.execFile)
export const readFileAsync = fs.promises.readFile
export const writeFileAsync = fs.promises.writeFile
export const rmdirAsync = fs.promises.rmdir