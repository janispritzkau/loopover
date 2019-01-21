import { Axis } from '.'

export class Board {
    grid: number[][]

    constructor(public cols: number, public rows: number) {
        this.grid = [...Array(this.rows)]
        .map((_, row) => [...Array(this.cols)]
        .map((_, col) => row * this.cols + col))
    }

    move(axis: Axis, index: number, n: number) {
        if (axis == Axis.Row) this.moveRow((index + this.rows) % this.rows, n)
        else this.moveColumn((index + this.cols) % this.cols, n)
    }

    isSolved(): boolean {
        for (let [rowIndex, row] of this.grid.entries()) {
            for (let [col, tile] of row.entries()) {
                if (tile != rowIndex * row.length + col) return false
            }
        }
        return true
    }

    pos(index: number) {
        for (let [r, row] of this.grid.entries()) for (let [c, i] of row.entries()) {
            if (i == index) return { col: c, row: r }
        }
    }

    moveRow(rowIndex: number, n: number) {
        const row = this.grid[rowIndex]
        this.grid[rowIndex] = row.map((cell, i) => row[(i + this.cols * 16 - n) % this.cols])
    }

    moveColumn(colIndex: number, n: number) {
        const col = [...Array(this.rows)].map((_, i) => this.grid[i][colIndex])
        for (let i = 0; i < this.rows; i++)
            this.grid[i][colIndex] = col[(i + this.rows * 16 - n) % this.rows]
    }

    toJSON() {
        return this.clone().grid
    }

    clone() {
        const board = new Board(this.cols, this.rows)
        for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
            board.grid[r][c] = this.grid[r][c]
        }
        return board
    }
}
