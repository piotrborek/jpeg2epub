import arg from "arg"
import path from "path"

import { errorMessage } from "./log"
import { cfgDir, JSONConfiguration } from "./config"
import { readFileAsync } from "./file-utils"
import { deepEqual } from "./utils"

export interface CutArea {
    top: number
    right: number
    bottom: number
    left: number
}

export interface CliOptions {
    name?: string
    keep?: string
    cutArea: CutArea
    resize: { width: number, height: number }
    profile?: string
    autoCut: boolean
    threshold: number
    quality: number
    jobs: number
    page: number
    keepTemp: boolean
    inputFile?: string
    inputDir?: string
}

function parseCutArea(text?: string) {
    const def = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    }

    if (!text) return def

    const s = text.split(" ")
    if (s.length != 4) return def

    const ints = s.map(str => parseInt(str))

    return {
        top: ints[0],
        right: ints[1],
        bottom: ints[2],
        left: ints[3]
    }
}

function parseResize(text?: string) {
    const def = {
        width: 0,
        height: 0
    }

    if (!text) return def

    const s = text.split(" ")
    if (s.length != 2) return def

    const ints = s.map(str => parseInt(str))

    return {
        width: ints[0],
        height: ints[1]
    }
}

function parseArgumentsIntoOptions(rawArgs: string[]): CliOptions {
    const args = arg(
        {
            "--name": String,
            "--keep": String,
            "--cut": String,
            "--resize": String,
            "--profile": String,
            "--autocut": arg.COUNT,
            "--threshold": String,
            "--quality": String,
            "--jobs": String,
            "--page": String,
            "--keep-temp": arg.COUNT,
            "-i": String,
            "-I": String,

            "-n": "--name",
            "-p": "--profile",
            "-t": "--threshold",
            "-q": "--quality",
            "-C": "--autocut",
            "-j": "--jobs"
        },
        {
            argv: rawArgs.slice(2)
        })

    return {
        name: args["--name"],
        keep: args["--keep"],
        cutArea: parseCutArea(args["--cut"]),
        resize: parseResize(args["--resize"]),
        profile: args["--profile"],
        autoCut: (args["--autocut"] ?? 0) !== 0,
        threshold: parseInt(args["--threshold"] ?? "30"),
        quality: parseInt(args["--quality"] ?? "90"),
        jobs: parseInt(args["--jobs"] ?? "0"),
        page: parseInt(args["--page"] ?? "1"),
        keepTemp: (args["--keep-temp"] ?? 0) !== 0,
        inputFile: args["-i"],
        inputDir: args["-I"]
    }
}

export async function cliAsync(args: string[]): Promise<CliOptions & { ok: boolean }> {
    const options = parseArgumentsIntoOptions(args)
    let required = (options.inputFile != null) || (options.inputDir != null)

    if (!required) {
        errorMessage("Missing parameters: -i or -I")
    }

    if (options.profile) {
        try {
            const json = await readFileAsync(path.join(cfgDir, options.profile), "utf8")
            const data = JSON.parse(json) as JSONConfiguration

            if (deepEqual(options.cutArea, { top: 0, right: 0, bottom: 0, left: 0})) {
                options.cutArea = data.cut
            }
            if (deepEqual(options.resize, { width: 0, height: 0 })) {
                options.resize = data.resize
            }
        } catch (e) {
            errorMessage(`Profile ${options.profile} not found.`)
            required = false
        }
    }

    return {
        ...options,
        ok: required
    }
}