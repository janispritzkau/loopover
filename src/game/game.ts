import { Axis, Board, Move } from "."
import { scrambleBoard } from "./scramble"

interface Transition {
  value: number
  start: number
  startTime: number
  time: number
  duration: number
}

interface Pointer {
  x: number
  y: number
  col: number
  row: number
  moveX: number
  moveY: number
}

export type LetterSystem = "numbers" | "letters" | "letters-xy";

export class Game {
  board!: Board
  width!: number
  height!: number
  tileSize!: number

  private ctx: CanvasRenderingContext2D

  darkText = false
  boldText = false
  noRegrips = false
  activeTile = 0
  blind = false
  locked = false
  letterSystem: LetterSystem = "numbers"

  transitionTime = 150
  pointers: Map<number, Pointer> = new Map()
  transitions: Map<number, Transition> = new Map()

  private moveAxis: Axis = Axis.Row
  private spaceDown = false
  private highlightActive = false
  private repaint = true

  onMove?: (move: Move, isPlayerMove: boolean) => void

  constructor(public canvas: HTMLCanvasElement, public cols: number, public rows: number) {
    this.canvas.tabIndex = 0
    this.ctx = canvas.getContext("2d")!
    this.addEventListeners()
    this.setBoardSize(cols, rows)

    requestAnimationFrame(this.frame)
  }

  setBoardSize(cols: number, rows?: number) {
    if (!rows) rows = cols
    this.board = new Board(cols, rows)
    this.rows = rows, this.cols = cols
    if (this.width != null) this.setWidth(this.width / devicePixelRatio)
  }

  setWidth(width: number) {
    this.width = Math.round(width * devicePixelRatio)
    this.height = this.width / (this.cols / this.rows)
    this.updateCanvas()
  }

  setHeight(height: number) {
    this.height = Math.round(height * devicePixelRatio)
    this.width = this.height * (this.cols / this.rows)
    this.updateCanvas()
  }

  private updateCanvas() {
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${this.width / devicePixelRatio}px`
    this.canvas.style.height = `${this.height / devicePixelRatio}px`

    this.tileSize = Math.ceil(this.width / this.cols + 0.1)

    this.ctx.textBaseline = "middle"
    this.ctx.textAlign = "center"

    this.repaint = true
  }

  setBlind(blind: boolean) {
    this.blind = blind
    this.repaint = true
  }

  setDarkText(darkText: boolean) {
    this.darkText = darkText
    this.repaint = true
  }

  setBoldText(boldText: boolean) {
    this.boldText = boldText
    this.repaint = true
  }

  setLetterSystem(letterSystem: LetterSystem) {
    this.letterSystem = letterSystem
    this.repaint = true
  }

  setBoard(board: Board) {
    this.board = board
    this.repaint = true
  }

  move(move: Move, isPlayerMove = false) {
    if (this.noRegrips) {
      const active = this.board.pos(this.activeTile)
      if (isPlayerMove && (move.axis == Axis.Col ? active.col : active.row) != move.index) {
        return false
      }
    }

    this.board.move(move)
    this.repaint = true

    if (this.onMove) {
      this.onMove(move, isPlayerMove)
    }

    return true
  }

  animatedMove(move: Move, isPlayerMove = false) {
    if (!this.move(move, isPlayerMove) || this.transitionTime == 0) return

    if (move.axis != this.moveAxis) {
      this.transitions.clear()
      this.moveAxis = move.axis
    }

    this.transitions.set(move.index, {
      start: -move.n, value: -move.n,
      startTime: performance.now(), time: 0,
      duration: this.transitionTime
    })
  }

  scramble() {
    scrambleBoard(this.board, this.noRegrips ? this.activeTile : undefined)
    this.repaint = true
  }

  private render(time: number) {
    const n = this.cols * this.rows
    const charCount = this.letterSystem == "letters-xy"
      ? 2
      : this.letterSystem == "letters" && n <= 26
        ? 1.7
        : n <= 1000 ? n <= 100 ? n <= 10 ? 1.7 : 1.9 : 2.5 : 4
    const fontSize = this.tileSize * (0.26 + 0.58 / charCount)

    this.ctx.font = `${this.boldText ? 500 : 400} ${fontSize}px Lexend, Roboto, sans-serif`
    this.ctx.clearRect(0, 0, this.width, this.height)

    for (let i = 0; i < (this.moveAxis == Axis.Col ? this.cols : this.rows); i++) {
      const transition = this.transitions.get(i)
      const moveAmount = transition ? transition.value : 0

      const w = (this.moveAxis == Axis.Col ? this.rows : this.cols)
      for (let j = Math.floor(-moveAmount); j < w - Math.floor(moveAmount); j++) {
        let row = i
        let col = (j % w + w) % w
        let x = j + moveAmount
        let y = i

        if (this.moveAxis == Axis.Col) {
          const tempRow = row
          row = col, col = tempRow
          const tempX = x
          x = y, y = tempX
        }

        x = Math.floor(x / this.cols * this.width)
        y = Math.floor(y / this.rows * this.height)

        const index = this.board.grid[row][col]

        if (this.blind) {
          const t = transition ? transition.time ** 0.5 : 0
          const flash = Math.floor((t < 0.5 ? t * 2 : 2 - t * 2) * 60)
          const gap = this.tileSize * 0.03

          this.ctx.fillStyle = `rgb(${100 + flash},${106 + flash},${118 + flash})`
          this.ctx.fillRect(x + gap, y + gap, this.tileSize - gap * 2, this.tileSize - gap * 2)
        } else {
          const cx = (index % this.cols + 0.1) / (this.cols - 0.7)
          const cy = (Math.floor(index / this.cols) + 0.2) / (this.rows - 0.6)

          const r = (1 - cx) * 252
          const g = cy * 228 + cx * (1 - cy) * 40
          const b = cx * 220

          this.ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`
          this.ctx.fillRect(Math.floor(x), Math.floor(y), this.tileSize, this.tileSize)
          this.ctx.fillStyle = this.darkText ? "rgba(0, 0, 0, 0.9)" : "#fff"

          let text = ""
          if (this.letterSystem == "letters" && n <= 26) {
            text = String.fromCharCode(index + 65)
          } else if (this.letterSystem == "letters-xy") {
            const x = Math.floor(index / this.rows)
            const y = index % this.cols
            text = String.fromCharCode(x + (x < 26 ? 65 : 71))
              + String.fromCharCode(y + (y < 26 ? 65 : 71))
          } else {
            text = (index + 1).toString()
          }

          this.ctx.fillText(text, x + Math.floor(this.tileSize / 2), y + Math.floor(this.tileSize / 2 + fontSize * 0.05))
        }

        if ((this.noRegrips || this.highlightActive) && index == this.activeTile) {
          const g = this.ctx.lineWidth = (this.tileSize * 0.1) | 0
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${(2 + Math.sin(time / 100)) * 0.2})`
          this.ctx.strokeRect(x + g / 2, y + g / 2, this.tileSize - g, this.tileSize - g)
        }
      }
    }
  }

  private frame = () => {
    const time = performance.now()

    if (this.transitions.size != 0) this.repaint = true

    for (const [index, transition] of this.transitions.entries()) {
      transition.time = (time - transition.startTime) / transition.duration
      transition.value = transition.start - transition.start * transition.time * (2 - transition.time)
      if (transition.time >= 1) this.transitions.delete(index)
    }

    if (this.repaint || this.noRegrips || this.highlightActive) {
      this.render(time)
      this.repaint = false
    }

    requestAnimationFrame(this.frame)
  }

  private onTouchStart = (identifier: number, x: number, y: number) => {
    if (this.locked) return

    const pointer: Pointer = {
      x, y, moveX: 0, moveY: 0,
      col: Math.floor(x * devicePixelRatio / this.width * this.cols),
      row: Math.floor(y * devicePixelRatio / this.height * this.rows)
    }

    this.pointers.set(identifier, pointer)

    if (!this.noRegrips || this.board.isSolved()) {
      this.activeTile = this.board.grid[pointer.row][pointer.col]
    }
  }

  private onTouchMove = (identifier: number, x: number, y: number) => {
    const pointer = this.pointers.get(identifier)
    if (!pointer) return

    let col = Math.floor(x * devicePixelRatio / this.width * this.cols)
    let row = Math.floor(y * devicePixelRatio / this.height * this.rows)

    pointer.moveX += col - pointer.col
    pointer.moveY += row - pointer.row

    const rowIndex = (pointer.row % this.rows + this.rows) % this.rows
    const pointersX = [...this.pointers.values()].filter(p => p.row == rowIndex)
    const moveX = Math.trunc(pointersX.reduce((a, b) => a + b.moveX, 0) / pointersX.length)

    if (moveX) {
      for (let i = Math.abs(moveX); i--;) {
        this.animatedMove({ axis: Axis.Row, index: rowIndex, n: Math.sign(moveX) }, true)
      }
      pointersX.forEach(p => (p.moveX = 0))
    }
    pointer.col = col

    const colIndex = (pointer.col % this.cols + this.cols) % this.cols
    const pointersY = [...this.pointers.values()].filter(p => p.col == colIndex)
    const moveY = Math.trunc(pointersY.reduce((a, b) => a + b.moveY, 0) / pointersY.length)

    if (moveY) {
      for (let i = Math.abs(moveY); i--;) {
        this.animatedMove({ axis: Axis.Col, index: colIndex, n: Math.sign(moveY) }, true)
      }
      pointersY.forEach(p => (p.moveY = 0))
    }
    pointer.row = row

    pointer.x = x
    pointer.y = y

    this.highlightActive = false
    this.repaint = true
  }

  private multiplierString = ""
  private multiplierTimeout: any

  handleKeyDown = (event: KeyboardEvent) => {
    const move = (axis: Axis, n: number) => {
      const pos = this.board.pos(this.activeTile)
      const multiplier = parseInt(this.multiplierString)
      this.multiplierString = ""

      if (multiplier) {
        n *= Math.min(multiplier, axis == Axis.Col ? this.rows : this.cols)
      } else if (event.ctrlKey || event.shiftKey) {
        n *= 2
      }

      if (this.spaceDown || this.noRegrips) {
        this.animatedMove({ axis, index: axis == Axis.Col ? pos.col : pos.row, n }, true)
      } else {
        if (axis == Axis.Row) {
          this.activeTile = this.board.grid[pos.row][((pos.col + n) % this.cols + this.cols) % this.cols]
        } else {
          this.activeTile = this.board.grid[((pos.row + n) % this.rows + this.rows) % this.rows][pos.col]
        }
      }
    }

    if ("1234567890".includes(event.key)) {
      clearTimeout(this.multiplierTimeout)
      this.multiplierTimeout = setTimeout(() => this.multiplierString = "", 1000)
      this.multiplierString += event.key
    }

    switch (event.key) {
      case " ": this.spaceDown = true; break
      case "ArrowLeft": case "a": case "h": move(Axis.Row, -1); break
      case "ArrowRight": case "d": case "l": move(Axis.Row, 1); break
      case "ArrowUp": case "w": case "k": move(Axis.Col, -1); break
      case "ArrowDown": case "s": case "j": move(Axis.Col, 1); break
      default: return true
    }

    this.highlightActive = true
    event.preventDefault()
  }

  handleKeyUp = (event: KeyboardEvent) => {
    if (event.key == " ") this.spaceDown = false
  }

  private addEventListeners() {
    let rect: ClientRect

    this.canvas.addEventListener("mousedown", event => {
      if (event.button != 0) return
      event.preventDefault()

      rect = this.canvas.getBoundingClientRect()
      this.canvas.focus()

      this.onTouchStart(-1, event.clientX - rect.left, event.clientY - rect.top)
    })

    addEventListener("mousemove", event => {
      if (this.pointers.has(-1)) {
        this.onTouchMove(-1, event.clientX - rect.left, event.clientY - rect.top)
      }
    })

    addEventListener("mouseup", () => {
      this.pointers.delete(-1)
    })

    this.canvas.addEventListener("touchstart", event => {
      event.preventDefault()
      rect = this.canvas.getBoundingClientRect()

      for (let touch of event.changedTouches) {
        this.onTouchStart(touch.identifier, touch.clientX - rect.left, touch.clientY - rect.top)
      }
    }, { passive: false })

    this.canvas.addEventListener("touchmove", event => {
      for (let touch of event.changedTouches) {
        this.onTouchMove(touch.identifier, touch.clientX - rect.left, touch.clientY - rect.top)
      }
    }, { passive: false })

    this.canvas.addEventListener("touchend", event => {
      for (let touch of event.changedTouches) {
        this.pointers.delete(touch.identifier)
      }
    })

    this.canvas.addEventListener("keydown", this.handleKeyDown)
    this.canvas.addEventListener("keyup", this.handleKeyUp)

    this.canvas.addEventListener("blur", () => {
      this.highlightActive = false
      this.repaint = true
    })
  }
}
