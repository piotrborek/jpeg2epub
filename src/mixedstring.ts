export type MixedStringType = 'S' | 'N'

export type MixedStringElement = {
    type: MixedStringType
    text: string
}

export type MixedStringArray = MixedStringElement[]

function stringCompare(a: string, b: string): number {
    if (a > b) return 1
    if (a < b) return -1

    return 0
}

function numberCompare(a: number, b: number): number {
    if (a > b) return 1
    if (a < b) return -1

    return 0
}

function mixedStringCompare(a: MixedString, b: MixedString): number {
    function compare(valA: IteratorResult<MixedStringElement>, valB: IteratorResult<MixedStringElement>): number {
        if (valA.done) return -1
        if (valB.done) return 1

        if (valA.value.type === valB.value.type && valA.value.type === 'S') {
            const cmp = stringCompare(valA.value.text, valB.value.text)
            if (cmp === 0) return compare(itA.next(), itB.next())
            else return cmp
            
        }

        if (valA.value.type === valB.value.type && valA.value.type === 'N') {
            const cmp = numberCompare(parseInt(valA.value.text), parseInt(valB.value.text))
            if (cmp === 0) return compare(itA.next(), itB.next())
            else return cmp
        }

        if (valA.value.type === 'N') return -1
        if (valB.value.type === 'S') return 1

        return 0
    }

    const itA = a.values()
    const itB = b.values()

    return compare(itA.next(), itB.next())
}

function mixedStringParse(text: string): MixedString {
    function appendMixedString(type: MixedStringType, char: string) {
        if (mixedString == null) {
            mixedString = {
                type,
                text: char
            }

            return
        }
        
        if (mixedString.type === type) {
            mixedString = {
                ...mixedString,
                text: mixedString.text + char
            }

            return
        }

        mixedStringArray.push(mixedString)
        mixedString = {
            type,
            text: char
        }
    }

    const mixedStringArray: MixedStringArray = []

    let mixedString: MixedStringElement | null = null

    for (const c of text) {
        const x = parseInt(c)

        if (isNaN(x)) appendMixedString('S', c)
        else appendMixedString('N', c)
    }

    if (mixedString != null) mixedStringArray.push(mixedString)

    return new MixedString(mixedStringArray)
}

export class MixedString {
    constructor(private _mixedStringArray: MixedStringArray) {
    }

    values() {
        return this._mixedStringArray.values()
    }

    asString(): string {
        return this._mixedStringArray.reduce((prev, curr) => prev + curr.text, '')
    }

    static compare(a: MixedString, b: MixedString): number {
        return mixedStringCompare(a, b)
    }

    static parse(text: string): MixedString {
        return mixedStringParse(text)
    }
}
