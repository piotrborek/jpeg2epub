import path from "path"

export function getName(options: { name?: string, inputFile?: string, inputDir?: string }): string {
    if (options.name) return options.name
    if (options.inputFile) return path.parse(options.inputFile).name
    if (options.inputDir) return path.parse(options.inputDir).name
    return "unknown"
}

export function deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export function fillZeroes(s: string, n: number): string {
    while (s.length < n) {
        s = "0" + s
    }
    return s
}

export function isNumeric(s: string): boolean {
    return /^\d+$/.test(s);
}

export function hasNumericFileNames(a: string[]): boolean {
    for (const s of a) {
        const p = path.parse(s)
        if (!isNumeric(p.name)) return false
    }
    return true
}