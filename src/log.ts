import chalk from "chalk"

export function errorMessage(msg: string): void {
    console.log(chalk.red(msg))
}

export function infoMessage(msg: string): void {
    console.log(chalk.green(msg))
}