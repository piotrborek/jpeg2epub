import arg from "arg"
import path from "path"

import { errorMessage } from "./log"
import { cfgDir, JSONConfiguration } from "./config"
import { readFileAsync } from "./file-utils"

export interface CliOptions {
    name?: string
    keep?: string
    cutArea: { top: number, right: number, bottom: number, left: number }
    resize: { width: number, height: number },
    profile?: string
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
            "-i": String,
            "-I": String,

            "-n": "--name",
            "-p": "--profile"
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

            options.cutArea = data.cut
            options.resize = data.resize
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