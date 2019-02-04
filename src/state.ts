import { Solve, Move, Board, Game } from './game'
import { Vue, Watch, Component } from 'vue-property-decorator'

export enum EventType {
    Normal = 0,
    Fmc = 1,
    Blind = 2
}

interface StoredState {
    version: number
    cols: number, rows: number
    event: EventType
    noRegrips?: boolean
    forceMobile?: boolean
    useLetters?: boolean
    darkText?: boolean
}

@Component
export class State extends Vue {
    game!: Game
    rows = 5
    cols = 5
    event = EventType.Normal
    noRegrips = false

    forceMobile = false
    useLetters = true
    darkText = false

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
        this.load()
        this.onBoardSizeChange()
    }

    @Watch('cols') @Watch('rows')
    @Watch('event') @Watch('noRegrips')
    @Watch('useLetters')
    @Watch('darkText')
    @Watch('forceMobile')
    async save() {
        await this.$nextTick
        const state: StoredState = {
            version: 0,
            cols: this.cols, rows: this.rows,
            event: this.event
        }
        if (this.noRegrips) state.noRegrips = true
        if (this.darkText) state.darkText = true
        if (!this.useLetters) state.useLetters = false
        if (this.forceMobile) state.forceMobile = true
        localStorage.setItem("loopover_new", JSON.stringify(state))
    }
    
    load() {
        const item = localStorage.getItem("loopover_new")
        if (!item) return
        const state = JSON.parse(item) as StoredState
        if (state.version != 0) return
        const { cols, rows, event, ...rest } = state
        this.cols = cols, this.rows = rows, this.event = event
        for (let [key, value] of Object.entries(rest)) {
            if (value != null) this.$data[key] = value
        }
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

    @Watch('useLetters') onUseLettersChanged() {
        this.game.useLetters = this.useLetters
        this.game.render()
    }

    @Watch('darkText') onDarkTextChanged() {
        this.game.darkText = this.darkText
        this.game.render()
    }

    @Watch('cols')
    @Watch('rows')
    @Watch('noRegrips')
    onBoardSizeChange() {
        this.cols = Math.min(Math.max(this.cols, 2), 20)
        this.rows = Math.min(Math.max(this.rows, 2), 20)
        this.game.setBoardSize(this.cols, this.rows)
        this.game.noRegrip = this.noRegrips
        if (this.noRegrips) {
            this.game.active = this.game.board.grid[Math.ceil((this.rows - 1) / 2)][Math.ceil((this.cols - 1) / 2)]
        }
        this.reset()
    }
}
