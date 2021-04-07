import chalk from "chalk"
import figlet from "figlet"
import os from "os"
import console from "console"
import perf_hooks from "perf_hooks"

import { checkConfigAsync, writeConfigAsync } from "./config"
import { cliAsync } from "./cli"
import { mkTempDirAsync } from "./file-utils"
import { buildDocumentAsync } from "./docbuilder"
import { getName } from "./utils"
import { errorMessage, infoMessage } from "./log"

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
    const startTime = perf_hooks.performance.now()

    showLogo()

    if (os.platform().toLocaleLowerCase() !== "linux") {
        errorMessage("Your OS is unsupported")
        return
    }

    const configError = await checkConfigAsync()
    if (configError) return

    const options = await cliAsync(process.argv)
    if (!options.ok) return

    await writeConfigAsync(options)

    const buildDir = await createOutputTempDirAsync(options)

    await buildDocumentAsync({ cli: options, buildDir })

    const time = (perf_hooks.performance.now() - startTime) / 1000

    console.log("\n")
    infoMessage(`It took: ${time.toFixed(2)} ms`)
}

main()