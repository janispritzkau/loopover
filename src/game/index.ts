export * from "./Board"
export * from "./Game"

export enum Axis {
  Row = "row",
  Col = "col"
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
  moves = moves.reduce<Move[]>((moves, { ...move }) => {
    if (moves.length == 0) return (moves.push(move), moves)
    const lastMove = moves[moves.length - 1]
    if (lastMove.axis == move.axis && lastMove.index == move.index) {
      lastMove.n += move.n
    } else {
      moves.push(move)
    }
    return moves
  }, [])

  return moves.map(move => {
    return (move.n == -1 ? "-" : move.n == 1 ? "" : move.n) + (move.axis == Axis.Row ? "R" : "C") + move.index
  }).join(" ")
}
