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
    return this.grid
  }

  clone() {
    return new Board(this.cols, this.rows, this.grid)
  }

  reset() {
    for (let i = this.cols * this.rows; i--;) {
      this.grid[~~(i / this.cols)][i % this.cols] = i
    }
  }

  move(move: Move) {
    if (move.axis == Axis.Row) {
      this.moveRow(move.index, move.n)
    } else {
      this.moveColumn(move.index, move.n)
    }
  }

  isSolved(): boolean {
    for (let [r, row] of this.grid.entries()) {
      for (let [c, tile] of row.entries()) {
        if (tile != r * row.length + c) return false
      }
    }
    return true
  }

  pos(index: number) {
    for (let [r, row] of this.grid.entries()) {
      for (let [c, i] of row.entries()) {
        if (i == index) return { col: c, row: r }
      }
    }
  }

  private moveRow(index: number, n: number) {
    const row = this.grid[index]
    this.grid[index] = row.map((_, i) => row[(((i - n) % this.cols) + this.cols) % this.cols])
  }

  private moveColumn(index: number, n: number) {
    const col = [...Array(this.rows)].map((_, i) => this.grid[i][index])

    for (let i = 0; i < this.rows; i++) {
      this.grid[i][index] = col[(((i - n) % this.rows) + this.rows) % this.rows]
    }
  }
}
