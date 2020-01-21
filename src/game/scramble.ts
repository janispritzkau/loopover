import { Board } from "./Board"
import { Axis } from "."

export function scrambleBoard(board: Board, noRegripsTile?: number) {
  for (let tries = 0; tries < 20; tries++) {
    if (noRegripsTile != null) {
      for (let i = 0; i < board.cols * board.rows + 50; i++) {
        const axis = Math.random() > 0.5 ? Axis.Col : Axis.Row
        const { row, col } = board.pos(noRegripsTile)!
        const n = 1 + Math.floor(Math.random() * (axis == Axis.Col ? board.rows - 1 : board.cols - 1))
        board.move({ axis, index: axis == Axis.Col ? col : row, n })
      }
    } else {
      randomizeBoard(board)
    }
    if (!board.isSolved()) return
  }
}

function randomizeBoard(board: Board) {
  if (board.cols < 2 || board.rows < 2) return

  const indices = [...Array(board.cols * board.rows)].map((_, i) => i)
  shuffle(indices)

  if ((board.cols * board.rows) % 2 && countInversions(indices) % 2) {
    [indices[0], indices[1]] = [indices[1], indices[0]]
  }

  board.grid = board.grid.map(row => row.map(i => indices[i]))
}

function countInversions(indices: number[]) {
  let inversions = 0
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      if (indices[i] > indices[j]) inversions += 1
    }
  }
  return inversions
}

function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
