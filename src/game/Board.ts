import { Axis, Move } from "."

export class Board {
  constructor(public cols: number, public rows: number,
    public grid: number[][] = [...Array(rows)]
      .map((_, row) => [...Array(cols)]
        .map((_, col) => row * cols + col))
  ) { }

  reset() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = r * this.cols + c
      }
    }
  }

  move(move: Move) {
    if (move.axis == Axis.Row) {
      this.moveRow((move.index + this.rows) % this.rows, move.n)
    } else {
      this.moveColumn((move.index + this.cols) % this.cols, move.n)
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

  moveRow(index: number, n: number) {
    const row = this.grid[index]
    this.grid[index] = row.map((_, i) => row[(i + this.cols * 16 - n) % this.cols])
  }

  moveColumn(index: number, n: number) {
    const col = [...Array(this.rows)].map((_, i) => this.grid[i][index])

    for (let i = 0; i < this.rows; i++) {
      this.grid[i][index] = col[(i + this.rows * 16 - n) % this.rows]
    }
  }

  clone() {
    const board = new Board(this.cols, this.rows)
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      board.grid[r][c] = this.grid[r][c]
    }
    return board
  }

  toJSON() {
    return this.clone().grid
  }
}
