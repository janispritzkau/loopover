export * from "./board"
export * from "./game"

export enum Axis {
  Row,
  Col
}

export interface Move {
  axis: Axis
  index: number
  n: number
  time?: number
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

export function movesToString(moves: Move[]) {
  return moves.map(move => {
    return move.n + (move.axis == Axis.Row ? "R" : "C") + move.index
  }).join(" ")
}
