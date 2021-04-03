import path from "path"

export function getName(options: { name?: string, inputFile?: string, inputDir?: string }): string {
    if (options.name) return options.name
    if (options.inputFile) return path.parse(options.inputFile).name
    if (options.inputDir) return path.parse(options.inputDir).name
    return "unknown"
}