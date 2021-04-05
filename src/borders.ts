import { BufferRet } from "jpeg-js"

function calculateBorder(threshold: number, removeMap: number[][]): number {
    const MAX = 0
    const INDEX = 1
    let border = 0
    let lastIndex = removeMap[0][INDEX]
    for (let i = 0; i < removeMap.length; i++) {
        if (removeMap[i][MAX] > threshold && removeMap[i][INDEX] - lastIndex < 64) {
            lastIndex = removeMap[i][INDEX]
            border++
        }
        else
            break
    }
    return border
}

function maxAndIndex(array: number[]): [number, number] {
    let max = array[0]
    let index = 0
    for (let i = 0; i < array.length; i++) {
        if (max < array[i]) {
            max = array[i]
            index = i
        }
    }
    return [max, index]
}

export function calculateTopAndBottomBorder(image: BufferRet, { threshold = 30 } = {}): [top: number, bottom: number] {
    const removeMap: number[][] = []

    for (let y = 0; y < image.height; y++) {
        const line = image.data.slice(y * image.width * 4, (y + 1) * image.width * 4)
        const counters = Array.from({ length: 256 }, () => 0)
        for (let x = 0; x < image.width * 4; x += 4) {
            counters[line[x]]++
            counters[line[x + 1]]++
            counters[line[x + 2]]++
        }
        const mi = maxAndIndex(counters)
        removeMap.push(mi)
    }

    const topBorder = calculateBorder((image.width * 3 * threshold) / 100, removeMap)
    const bottomBorder = calculateBorder((image.width * 3 * threshold) / 100, removeMap.reverse())

    return [topBorder, bottomBorder]
}

/*
export function imageCut(image: BufferRet, cutArea: { top: number, right: number, bottom: number, left: number }): BufferRet {
    const width = image.width - cutArea.left - cutArea.right
    const height = image.height - cutArea.top - cutArea.bottom

    const buffer = Buffer.allocUnsafe(width * height * 4)

    for (let y = 0; y < height; y++) {
        const sourceY = y + cutArea.top
        image.data.copy(buffer, y * width * 4, (sourceY * image.width + cutArea.left) * 4, ((sourceY + 1) * image.width - cutArea.right) * 4)
    }

    return {
        data: buffer,
        width,
        height
    }
}
*/