import { Solve, Move, Board, Game } from './game'
import { Vue, Watch, Component } from 'vue-property-decorator'

export enum EventType {
    Normal = 0,
    Fmc = 1,
    Blind = 2
}

@Component
export class State extends Vue {
    game!: Game
    rows = 5
    cols = 5
    event = EventType.Normal
    noRegrips = false

    gameStarted = false
    isScrambled = false

    startTime = 0
    time = 0
    memoTime = 0
    interval!: number

    inSolvingPhase = false
    dnf = false

    solves: Solve[] = []
    scrambledBoard?: Board
    moveHistory: Move[] = []
    undoCount = 0

    init(game: Game) {
        this.game = game
        this.game.onMove = this.onMove.bind(this)
        this.game.canvas.addEventListener("keydown", e => {
            switch (e.key) {
                case "u": this.undo(); break
                case "r": this.redo(); break
            }
        })
        this.onBoardSizeChange()
    }

    undo() {
        if (this.undoCount >= this.moveHistory.length) return
        const index = this.moveHistory.length - this.undoCount - 1
        const move = this.moveHistory[index]
        this.game.animatedMove(move.axis, move.index, -move.n)
        this.undoCount += 1
    }

    redo() {
        if (this.undoCount == 0) return
        const move = this.moveHistory[this.moveHistory.length - this.undoCount]
        this.game.animatedMove(move.axis, move.index, move.n)
        this.undoCount -= 1
    }


    reset() {
        clearInterval(this.interval)
        this.moveHistory = []
        this.undoCount = 0
        this.solves = []
        this.dnf = false
        this.isScrambled = this.gameStarted = false
        this.time = this.memoTime = 0
    }

    scramble() {
        this.game.canvas.focus()
        clearInterval(this.interval)
        this.game.scramble()
        this.gameStarted = false, this.isScrambled = true
        this.scrambledBoard = this.game.board.clone()
        this.moveHistory = []
        this.dnf = false
        this.undoCount = 0
        this.time = this.memoTime = 0
        if (this.event == EventType.Blind) this.startGame()
    }

    startGame() {
        this.gameStarted = true
        this.time = this.memoTime = 0
        this.inSolvingPhase = false
        this.startTime = Date.now()
        this.interval = setInterval(() => {
            this.time = Date.now() - this.startTime
        }, 87)
    }

    onMove(move: Move) {
        if (this.isScrambled && !this.gameStarted) this.startGame()
        if (!this.gameStarted) return
        if (this.undoCount > 0) {
            this.moveHistory.splice(this.moveHistory.length - this.undoCount, this.undoCount)
            this.undoCount = 0
        }
        this.moveHistory.push(move)
        if (this.event == EventType.Blind) {
            this.game.blind = true
            this.game.render()
            this.inSolvingPhase = true
            this.memoTime = Date.now() - this.startTime
        } else if (this.game.board.isSolved()) {
            this.onSolved()
        }
    }

    done() {
        this.game.blind = false
        this.game.render()
        this.dnf = !this.game.board.isSolved()
        this.onSolved()
    }

    onSolved() {
        clearInterval(this.interval)
        this.time = Date.now() - this.startTime
        this.isScrambled = false
        this.gameStarted = false
        this.inSolvingPhase = false
        this.game.pointers.clear()
        this.solves.push({
            time: this.time,
            memoTime: this.memoTime,
            moves: this.moveHistory,
            scramble: this.scrambledBoard!,
            dnf: this.dnf
        })
    }

    @Watch('cols')
    @Watch('rows')
    @Watch('noRegrips')
    onBoardSizeChange() {
        this.cols = Math.min(Math.max(this.cols, 2), 50)
        this.rows = Math.min(Math.max(this.rows, 2), 50)
        this.game.setBoardSize(this.cols, this.rows)
        this.game.noRegrip = this.noRegrips
        if (this.noRegrips) {
            this.game.active = this.cols * this.rows - 1
        }
        this.reset()
    }
}
