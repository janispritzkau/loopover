import { Board } from './Board'

export function scrambleBoard(board: Board) {
    for (let tries = 0; tries < 20; tries++) {
        randomizeBoard(board)
        if (!board.isSolved() && isSolvable(board)) return
    }
}

function randomizeBoard(board: Board) {
    const indices = [...Array(board.cols * board.rows)].map((_, i) => i)
    shuffle(indices)
    board.grid = board.grid.map(row => row.map(i => indices[i]))
}

function isSolvable(board: Board) {
    if ((board.cols * board.rows) % 2 == 0) return true

    const indices: number[] = []
    board.grid.forEach(row => row.forEach(i => indices.push(i)))

    let inversions = 0
    for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
            if (indices[i] > indices[j]) inversions += 1
        }
    }
    return inversions % 2 == 0
}

function shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}