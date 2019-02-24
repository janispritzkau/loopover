import { Axis, Board, Move } from '.'
import { scrambleBoard } from './scramble';

interface Transition {
    value: number, start?: number
    time?: number
    startTime?: number
    isAnimated?: boolean
}

interface Pointer {
    x: number, y: number
    col: number, row: number
    startX: number, startY: number
    startCol: number, startRow: number
}

export class Game {
    board!: Board
    cols!: number
    rows!: number

    width!: number
    height!: number
    tileSize!: number
    dpr = devicePixelRatio
    private ctx: CanvasRenderingContext2D

    darkText = false
    noRegrip = false
    active = 0
    blind = false
    locked = false
    useLetters = true
    transitionTime = 150
    pointers: Map<number, Pointer> = new Map
    transitions: Map<number, Transition> = new Map
    private moveAxis: Axis = Axis.Row
    private spaceDown = false
    private highlightActive = false

    onMove?: (move: Move) => void

    constructor(public canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!
        this.addEventListeners()
        this.canvas.tabIndex = 0
        this.canvas.focus()
        requestAnimationFrame(this.frame)
    }

    setBoardSize(cols: number, rows?: number) {
        if (!rows) rows = cols
        this.board = new Board(cols, rows)
        this.rows = rows, this.cols = cols
        this.setWidth(this.width / this.dpr)
    }

    setWidth(width: number) {
        this.width = Math.round(width * this.dpr)
        this.height = this.width / (this.cols / this.rows)
        this.updateCanvas()
    }

    setHeight(height: number) {
        this.height = Math.round(height * this.dpr)
        this.width = this.height * (this.cols / this.rows)
        this.updateCanvas()
    }

    private updateCanvas() {
        this.canvas.width = this.width, this.canvas.height = this.height
        this.canvas.style.width = `${this.width / this.dpr}px`
        this.canvas.style.height = `${this.height / this.dpr}px`
        this.tileSize = Math.ceil(this.width / this.cols + 0.1)
        this.ctx.textBaseline = "middle"
        this.ctx.textAlign = "center"
    }

    move(axis: Axis, index: number, n: number, isPlayerMove = false) {
        this.board.move(axis, index, n)
        if (isPlayerMove && this.onMove) this.onMove({ axis, index, n })
    }

    animatedMove(axis: Axis, index: number, n: number, isPlayerMove = false) {
        if (axis == Axis.Col) index = (index + this.cols) % this.cols
        else index = (index + this.rows) % this.rows
        if (this.noRegrip) {
            const active = this.board.pos(this.active)!
            if (isPlayerMove && (axis == Axis.Col ? active.col : active.row) != index) return
        }
        this.move(axis, index, n, isPlayerMove)
        if (axis != this.moveAxis) this.transitions.clear(), this.moveAxis = axis
        this.transitions.set(index, {
            start: -n, value: -n, startTime: Date.now(), isAnimated: true
        })
        return new Promise(res => setTimeout(res, this.transitionTime))
    }

    scramble() {
        scrambleBoard(this.board, this.noRegrip ? this.active : undefined)
    }

    render() {
        const useLetters = this.useLetters && this.cols * this.rows <= 26
        const fontSize = this.tileSize * (this.cols >= 32 ? 0.42 : this.cols > 10 ? 0.45 : 0.53)
        this.ctx.font = `${this.darkText ? 500 : 400} ${fontSize}px Roboto`
        this.ctx.clearRect(0, 0, this.width, this.height)
        for (let i = 0; i < (this.moveAxis == Axis.Col ? this.cols : this.rows); i++) {
            const transition = this.transitions.get(i)
            const moveAmount = transition ? transition.value : 0

            const w = (this.moveAxis == Axis.Col ? this.rows : this.cols)
            for (let j = Math.floor(-moveAmount); j < w - Math.floor(moveAmount); j++) {
                let [row, col] = [i, (j + w * 2) % w]
                let [x, y] = [j + moveAmount, i]
                if (this.moveAxis == Axis.Col) [row, col] = [col, row], [x, y] = [y, x];
                [x, y] = [(x / this.cols * this.width) | 0, (y / this.rows * this.height) | 0]

                const index = this.board.grid[row][col]
                if (this.blind) {
                    const t = transition ? transition.time! ** 0.5 : 0
                    const flash = (t < 0.5 ? t * 2 : 2 - t * 2) * 60
                    const gap = this.tileSize * 0.03
                    this.ctx.fillStyle = `rgb(${[100 + flash, 104 + flash, 109 + flash].join()})`
                    this.ctx.fillRect(x + gap, y + gap, this.tileSize - gap * 2, this.tileSize - gap * 2)
                } else {
                    const cx = (index % this.cols + 0.1) / (this.cols - 0.6)
                    const cy = (((index / this.cols) | 0) + 0.2) / (this.rows - 0.6)
                    const color = [(1 - cx) * 235 + 15, cy * 210 + cx * (1 - cy) * 50 + 15, cx * 220]

                    this.ctx.fillStyle = `rgb(${color.map(x => x | 0).join()})`
                    this.ctx.fillRect(x | 0, y | 0, this.tileSize, this.tileSize)
                    this.ctx.fillStyle = this.darkText ? "rgba(0, 0, 0, 0.9)" : "#fff"
                    const text = useLetters ? String.fromCharCode(index + 65) : (index + 1).toString()
                    this.ctx.fillText(text, x + (this.tileSize / 2) | 0, y + (this.tileSize / 2 + fontSize * 0.05) | 0)
                }
                if ((this.noRegrip || this.highlightActive) && index == this.active) {
                    const g = this.ctx.lineWidth = (this.tileSize * 0.1) | 0
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${(2 + Math.sin(Date.now() / 100)) * 0.2})`
                    this.ctx.strokeRect(x + g / 2, y + g / 2, this.tileSize - g, this.tileSize - g)
                }
            }
        }
    }

    private frame = () => {
        for (let [index, transition] of this.transitions.entries()) {
            if (!transition.isAnimated) continue
            const time = transition.time = (Date.now() - transition.startTime!) / this.transitionTime
            transition.value = transition.start! - transition.start! * time * (2 - time)
            if (time >= 1) this.transitions.delete(index)
        }
        this.render()
        requestAnimationFrame(this.frame)
    }

    private onTouchStart = (identifier: number, pointer: Pointer) => {
        if (this.locked) return
        this.pointers.set(identifier, pointer)
        pointer.startCol = Math.floor(pointer.startX * this.dpr / this.width * this.cols)
        pointer.startRow = Math.floor(pointer.startY * this.dpr / this.height * this.rows)
        if (!(this.noRegrip && !this.board.isSolved())) this.active = this.board.grid[pointer.startRow][pointer.startCol]
    }

    private onTouchMove = (pointer: Pointer) => {
        pointer.col = Math.floor(pointer.x * this.dpr / this.width * this.cols)
        pointer.row = Math.floor(pointer.y * this.dpr / this.height * this.rows)
        const moveX = pointer.row - pointer.startRow, moveY = pointer.col - pointer.startCol
        if (moveX) this.animatedMove(Axis.Col, (pointer.startCol + this.cols) % this.cols, moveX, true)
        pointer.startRow = pointer.row
        if (moveY) this.animatedMove(Axis.Row, (pointer.startRow + this.rows) % this.rows, moveY, true)
        pointer.startCol = pointer.col
    }

    private onTouchEnd = (identifier: number, pointer: Pointer) => {
        this.pointers.delete(identifier)
    }

    private addEventListeners() {
        let rect: ClientRect
        this.canvas.addEventListener("mousedown", e => {
            this.canvas.focus()
            e.preventDefault(), rect = this.canvas.getBoundingClientRect()
            this.onTouchStart(-1, {
                startX: e.clientX - rect.left, startY: e.clientY - rect.top,
                x: 0, y: 0, startCol: 0, startRow: 0, col: 0, row: 0
            })
        })
        addEventListener("mousemove", e => {
            const pointer = this.pointers.get(-1)
            if (!pointer) return
            this.highlightActive = false
            pointer.x = e.clientX - rect.left, pointer.y = e.clientY - rect.top
            this.onTouchMove(pointer)
        })
        addEventListener("mouseup", e => {
            const pointer = this.pointers.get(-1)
            if (pointer) this.onTouchEnd(-1, pointer)
        })
        this.canvas.addEventListener("touchstart", e => {
            if (!e.cancelable) return
            e.preventDefault(), rect = this.canvas.getBoundingClientRect()
            for (let touch of e.changedTouches) this.onTouchStart(touch.identifier, {
                startX: touch.clientX - rect.left, startY: touch.clientY - rect.top,
                x: 0, y: 0, startCol: 0, startRow: 0, col: 0, row: 0
            })
        })
        addEventListener("touchmove", e => {
            for (let touch of e.changedTouches) {
                const pointer = this.pointers.get(touch.identifier)
                if (!pointer) continue
                pointer.x = touch.clientX - rect.left, pointer.y = touch.clientY - rect.top
                this.onTouchMove(pointer)
            }
        })
        addEventListener("touchend", e => {
            for (let touch of e.changedTouches) {
                const pointer = this.pointers.get(touch.identifier)
                if (pointer) this.onTouchEnd(touch.identifier, pointer)
            }
        })
        const move = (axis: Axis, n: number) => {
            const pos = this.board.pos(this.active)!
            if (this.spaceDown || (this.noRegrip && !this.board.isSolved())) {
                this.animatedMove(axis, axis == Axis.Col ? pos.col : pos.row, n, true)
            } else {
                if (axis == Axis.Row) {
                    this.active = this.board.grid[pos.row][(pos.col + n + this.cols) % this.cols]
                } else {
                    this.active = this.board.grid[(pos.row + n + this.rows) % this.rows][pos.col]
                }
            }
        }
        this.canvas.addEventListener("keydown", e => {
            switch (e.key) {
                case " ": this.spaceDown = true; break
                case "ArrowLeft": case "a": move(Axis.Row, -1); break
                case "ArrowRight": case "d": move(Axis.Row, 1); break
                case "ArrowUp": case "w": move(Axis.Col, -1); break
                case "ArrowDown": case "s": move(Axis.Col, 1); break
                default: return
            }
            this.highlightActive = true
            e.preventDefault()
        })
        this.canvas.addEventListener("keyup", e => {
            if (e.key == " ") this.spaceDown = false
        })
        this.canvas.addEventListener("blur", () => {
            this.highlightActive = false
        })
    }
}
