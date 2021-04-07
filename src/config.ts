import fs from "fs"
import os from "os"
import path from "path"

import * as fsutils from "./file-utils"
import { errorMessage } from "./log"
import { CliOptions } from "./cli"

export interface JSONConfiguration {
    cut: {
        top: number,
        right: number,
        bottom: number,
        left: number
    }
    resize: {
        width: number,
        height: number
    }
}

export const zipBin = "/usr/bin/zip"
export const unzipBin = "/usr/bin/unzip"
export const magickBin = "/usr/bin/magick"
export const sysCfgDir = `${os.homedir()}/.config`
export const cfgDir = `${sysCfgDir}/jpeg2epub`

export async function checkZipProgramAsync(): Promise<boolean> {
    return await fsutils.accessAsync(zipBin, fs.constants.X_OK)
}

export async function checkUnzipProgramAsync(): Promise<boolean> {
    return await fsutils.accessAsync(unzipBin, fs.constants.X_OK)
}

export async function checkMagickProgramAsync(): Promise<boolean> {
    return await fsutils.accessAsync(magickBin, fs.constants.X_OK)
}

export async function checkTmpDirAsync(): Promise<boolean> {
    return await fsutils.accessAsync(os.tmpdir(), fs.constants.R_OK | fs.constants.W_OK)
}

export async function checkCfgDirAsync(): Promise<boolean> {
    const attrsOk = await fsutils.accessAsync(sysCfgDir, fs.constants.R_OK | fs.constants.W_OK)
    if (attrsOk) await fsutils.mkdirAsync(cfgDir)
    return attrsOk
}

export async function checkConfigAsync(): Promise<boolean> {
    const zipExists = await checkZipProgramAsync()
    if (!zipExists) {
        errorMessage(`File ${zipBin} could not be found or is not executable.`)
    }

    const unzipExists = await checkUnzipProgramAsync()
    if (!unzipExists) {
        errorMessage(`File ${unzipBin} could not be found or is not executable.`)
    }

    const magickExists = await checkMagickProgramAsync()
    if (!magickExists) {
        errorMessage(`File ${magickBin} could not be found or is not executable.`)
    }

    const tmpRW = await checkTmpDirAsync()
    if (!tmpRW) {
        errorMessage(`Directory ${os.tmpdir()} doesn't exist or is readonly.`)
    }

    const cfgRW = await checkCfgDirAsync()
    if (!cfgRW) {
        errorMessage(`Directory ${cfgDir} doesn't exist or is readonly.`)
    }

    return !(zipExists && unzipExists && magickExists && tmpRW && cfgRW)
}

export async function writeConfigAsync(cli: CliOptions): Promise<void> {
    if (!cli.keep) return

    const data = {
        cut: cli.cutArea,
        resize: cli.resize
    }

    await fsutils.writeFileAsync(path.join(cfgDir, cli.keep), JSON.stringify(data))
}