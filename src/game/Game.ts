import { Axis, Board, Move } from '.'
import { scrambleBoard } from './scramble';

interface Transition {
    value: number, start?: number
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

    locked = false
    transitionTime = 120
    pointers: Map<number, Pointer> = new Map
    transitions: Map<number, Transition> = new Map
    private moveAxis: Axis = Axis.Row
    private animating = false

    onMove?: (move: Move) => void

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!
        this.addEventListeners()
    }

    setBoardSize(cols: number, rows?: number) {
        if (!rows) rows = cols
        this.board = new Board(cols, rows)
        this.rows = rows, this.cols = cols
        this.setWidth(this.width / this.dpr)
    }
    
    setWidth(width: number) {
        this.width = width * this.dpr
        this.height = this.width / (this.cols / this.rows)
        this.updateCanvas()
    }
    
    setHeight(height: number) {
        this.height = height * this.dpr
        this.width = this.height * (this.cols / this.rows)
        this.updateCanvas()
    }
    
    private updateCanvas() {
        this.canvas.width = this.width, this.canvas.height = this.height
        this.canvas.style.width = `${Math.floor(this.width / this.dpr)}px`
        this.canvas.style.height = `${Math.floor(this.height / this.dpr)}px`
        this.tileSize = Math.ceil(this.width / this.cols + 0.1)
        this.ctx.textBaseline = "middle"
        this.ctx.textAlign = "center"
        this.render()
    }

    move(axis: Axis, index: number, n: number, isPlayerMove = false) {
        this.board.move(axis, index, n)
        if (isPlayerMove && this.onMove) this.onMove({ axis, index, n })
    }

    animatedMove(axis: Axis, index: number, n: number, isPlayerMove = false) {
        if (axis == Axis.Col) index = (index + this.cols) % this.cols
        else index = (index + this.rows) % this.rows
        this.move(axis, index, n, isPlayerMove)
        if (axis != this.moveAxis) this.transitions.clear(), this.moveAxis = axis
        this.transitions.set(index, {
            start: -n, value: -n, startTime: Date.now(), isAnimated: true
        })
        if (!this.animating) requestAnimationFrame(this.frame)
        return new Promise(res => setTimeout(res, this.transitionTime))
    }

    scramble() {
        scrambleBoard(this.board)
        this.render()
    }

    render() {
        this.ctx.font = `${this.tileSize * (this.cols >= 32 ? 0.42 : this.cols > 10 ? 0.44 : 0.48)}px Roboto`     
        this.ctx.clearRect(0, 0, this.width, this.height)
        for (let i = 0; i < (this.moveAxis == Axis.Col ? this.cols : this.rows); i++) {
            const transition = this.transitions.get(i)
            const moveAmount = transition ? transition.value : 0

            for (let j = Math.floor(-moveAmount); j < (this.moveAxis == Axis.Col ? this.rows : this.cols) - Math.floor(moveAmount); j++) {
                let [row, col] = [i, j]
                let [x, y] = [j + moveAmount, i]
                if (this.moveAxis == Axis.Col) [row, col] = [col, row], [x, y] = [y, x];
                [x, y] = [(x / this.cols * this.width) | 0, (y / this.rows * this.height) | 0]

                const index = this.board.grid[(row + this.rows * 8) % this.rows][(col + this.cols * 8) % this.cols]
                const cx = (index % this.cols + 0.1) / (this.cols - 0.6)
                const cy = (((index / this.cols) | 0) + 0.2) / (this.rows - 0.6)
                const color = [(1 - cx) * 230 + 20, cy * 190 + cx * (1 - cy) * 40 + 30, cx * 230]

                this.ctx.fillStyle = `rgb(${color.map(x => x | 0).join()})`
                this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
                this.ctx.fillStyle = "#fff"
                this.ctx.fillText((index + 1).toString(), x + this.tileSize / 2, y + this.tileSize / 2 + 1)
            }
        }
    }

    private frame = () => {
        this.animating = true
        let animatedTransitions = 0
        for (let [index, transition] of this.transitions.entries()) {
            if (!transition.isAnimated) continue
            animatedTransitions += 1
            const time = (Date.now() - transition.startTime!) / this.transitionTime
            transition.value = transition.start! - transition.start! * time * (2 - time)
            if (time >= 1) this.transitions.delete(index)
        }
        this.render()
        if (animatedTransitions == 0) this.animating = false
        else requestAnimationFrame(this.frame)
    }

    private onTouchStart = (identifier: number, pointer: Pointer) => {
        if (this.locked) return
        this.pointers.set(identifier, pointer)
        pointer.startCol = Math.floor(pointer.startX * this.dpr / this.width * this.cols)
        pointer.startRow = Math.floor(pointer.startY * this.dpr / this.height * this.rows)
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
            e.preventDefault(), rect = this.canvas.getBoundingClientRect()
            this.onTouchStart(-1, {
                startX: e.clientX - rect.left, startY: e.clientY - rect.top,
                x: 0, y: 0, startCol: 0, startRow: 0, col: 0, row: 0
            })
        })
        addEventListener("mousemove", e => {
            const pointer = this.pointers.get(-1)
            if (!pointer) return
            pointer.x = e.clientX - rect.left, pointer.y = e.clientY - rect.top
            this.onTouchMove(pointer)
        })
        addEventListener("mouseup", e => {
            const pointer = this.pointers.get(-1)
            if (pointer) this.onTouchEnd(-1, pointer)
        })
        this.canvas.addEventListener("touchstart", e => {
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
    }
}