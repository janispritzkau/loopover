import { Board } from "./Board"
import { Game } from "./Game"

export enum Axis {
    Row = 1, Col
}

export interface Move {
    axis: Axis
    index: number
    n: number
}

export function movesFromString(string: string) {
    const moves: Move[] = []
    for (let part of string.split(" ")) {
        const match = part.match(/(-?)(\d*)(R|C)(\d*)('?)/)
        if (!match) throw new Error("Invalid notation")
        const [, sgn, num, ax, idx, p] = match
        const n = num ? parseInt(num) : 1
        const index = idx ? parseInt(idx) : 0
        moves.push({
            axis: ax == "R" ? Axis.Row : Axis.Col,
            index: p ? -index - 1 : index,
            n: sgn ? -n : n
        })
    }
    return moves
}

export interface Solve {
    time: number
    moves: Move[] | number
    scramble?: Board
    dnf?: boolean
    memoTime?: number
}

export { Board, Game }