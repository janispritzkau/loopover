import { Axis, Move } from "."

export class Board {
  grid: number[][]

  static deserialize(grid: number[][]) {
    return new Board(grid[0].length, grid.length, grid)
  }

  constructor(public cols: number, public rows: number, grid?: number[][]) {
    if (grid) this.grid = grid
    else this.grid = [...Array(rows)].map((_, r) => [...Array(cols)].map((_, c) => r * cols + c))
  }

  serialize() {
    return this.clone().grid
  }

  clone() {
    return new Board(this.cols, this.rows, this.grid.map(row => [...row]))
  }

  reset() {
    for (let i = this.cols * this.rows; i--;) {
      this.grid[Math.floor(i / this.cols)][i % this.cols] = i
    }
  }

  move(move: Move) {
    if (move.axis == Axis.Row) {
      this.moveRow(move.index, move.n)
    } else {
      this.moveColumn(move.index, move.n)
    }
  }

  isSolved() {
    for (let i = this.cols * this.rows; i--;) {
      if (this.grid[Math.floor(i / this.cols)][i % this.cols] != i) return false
    }
    return true
  }

  pos(index: number) {
    for (let row = this.rows; row--;) {
      for (let col = this.cols; col--;) {
        if (this.grid[row][col] == index) return { row, col }
      }
    }
    throw new Error("Index not found in board")
  }

  private moveRow(index: number, n: number) {
    const row = this.grid[index]
    this.grid[index] = row.map((_, i) => row[((i - n) % this.cols + this.cols) % this.cols])
  }

  private moveColumn(index: number, n: number) {
    const col = [...Array(this.rows)].map((_, i) => this.grid[i][index])

    for (let i = 0; i < this.rows; i++) {
      this.grid[i][index] = col[((i - n) % this.rows + this.rows) % this.rows]
    }
  }
}
