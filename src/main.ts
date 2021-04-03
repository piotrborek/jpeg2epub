import chalk from "chalk"
import figlet from "figlet"
import os from "os"

import { checkConfig, writeConfigAsync } from "./config"
import { cliAsync } from "./cli"
import { mkTempDirAsync } from "./file-utils"
import { buildDocumentAsync } from "./docbuilder"
import { getName } from "./utils"
import { errorMessage } from "./log"

function showLogo() {
    console.log(
        chalk.yellow(
            figlet.textSync('jpeg2epub', { horizontalLayout: 'full' })
        )
    )
    console.log("\n")
}

async function createOutputTempDirAsync(options: { name?: string, inputFile?: string, inputDir?: string }): Promise<string> {
    return await mkTempDirAsync(getName(options))
}

async function main() {
    showLogo()

    if (os.platform().toLocaleLowerCase() !== "linux") {
        errorMessage("Your OS is unsupported")
        return
    }

    const configError = await checkConfig()
    if (configError) return

    const options = await cliAsync(process.argv)
    if (!options.ok) return

    await writeConfigAsync(options)

    const buildDir = await createOutputTempDirAsync(options)

    buildDocumentAsync({ cli: options, buildDir })
}

main()