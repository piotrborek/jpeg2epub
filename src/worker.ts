import os from "os"
import child_process from "child_process"

import { CliOptions } from "./cli.js"

function spawnAync(command: string, args: string[]): Promise<void> {
    return new Promise<void>(resolve => {
        const process = child_process.spawn(command, args, { stdio: "ignore", windowsHide: true })
        process.on("close", () => {
            resolve()
        })        
    })
}

export async function execProcessInParallelAsync(command: string, argsList: string[][], cli: CliOptions): Promise<void> {
    const noOfCpus = cli.jobs === 0 ? os.cpus().length : cli.jobs

    let index = 0;

    async function runTask() {
        if (index >= argsList.length) return

        await spawnAync(command, argsList[index++])
        await runTask()
    }

    const tasks: Promise<void>[] = []
    for (let i = 0; i < noOfCpus; i++) {
        tasks.push(runTask())
    }

    return Promise
            .all(tasks)
            .then(() => { return })
}
