import os from "os"
import child_process from "child_process"

import { CliOptions } from "./cli"

function spawn(command: string, args: string[], closeCallback: () => void) {
    const process = child_process.spawn(command, args, { stdio: "ignore", windowsHide: true })
    process.on("close", () => {
        closeCallback()
    })
}

export async function execProcessInParallelAsync(command: string, argsList: string[][], cli: CliOptions): Promise<void> {
    const noOfCpus = cli.jobs === 0 ? os.cpus().length : cli.jobs
    let spawns = 0

    function run(index: number, resolve: () => void) {
        setImmediate(() => {
            if (index == argsList.length && spawns == 0) {
                resolve()
            } else {
                if (spawns < noOfCpus && index < argsList.length) {
                    spawn(command, argsList[index], () => { spawns-- })
                    spawns++
                    run(index + 1, resolve)
                } else {
                    run(index, resolve)
                }
            }
        })
    }

    return new Promise(resolve => {
        run(0, resolve)
    })
}