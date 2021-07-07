import { LoopoverDB, deserializeSolve, syncSolves, saveSolve, SerializedSolve } from "./db"
import { calculateAverages, AvgScores } from "./averages"
import { vue, EventType, Solve } from "."
import { Move, Board, Game, LetterSystem } from "../game"
import * as auth from "../auth"

export interface Record {
  averageOf: number
  difference: number
  fmc: boolean
}

export class State {
  cols = 5
  rows = 5
  custom = false
  event = EventType.Normal
  noRegrips = false

  darkMode = false
  forceMobile = false
  letterSystem: LetterSystem = "letters"
  darkText = false
  boldText = false
  animations = true
  transitionTime = 150
  hideInspectHint = false

  started = false
  scrambled = false
  inSolvingPhase = false
  dnf = false

  time = 0
  startTime = 0
  memoTime = 0
  interval?: any

  scrambledBoard?: Board
  moveHistory: Move[] = []
  undos = 0
  inspecting = false
  replaying = false
  replaySpeed = 1

  solves: Solve[] = []
  allSolves: Solve[] = []
  sessionSolves: { [event: string]: Solve[] } = {}

  newRecord: Record | null = null
  averages = new Map<number, AvgScores>()

  db?: LoopoverDB
  session = Date.now()
  game!: Game

  auth = auth.state
  reloadPage: Function | null = null

  get user() {
    return auth.state.user
  }

  get eventName() {
    return `${this.cols}x${this.rows}`
      + ["", "-fmc", "-bld"][this.event]
      + (this.noRegrips ? "-nrg" : "")
  }

  get displayTime() {
    if (this.inspecting && !this.replaying) {
      return this.undoable
        ? this.moveHistory[this.moveHistory.length - this.undos - 1].time
        : 0
    } else {
      return this.time
    }
  }

  get moves() {
    return this.moveHistory.length - this.undos
  }

  get showUndoRedo() {
    return this.event == EventType.Fmc || this.inspecting
  }

  get undoable() {
    return this.undos != this.moveHistory.length && !this.replaying
  }

  get redoable() {
    return this.undos != 0 && !this.replaying
  }

  formatTime(ms?: number | null) {
    if (ms == null) return "―"
    ms = Math.round(ms)
    const s = ms / 1000
    const min = (s / 60) | 0, sec = s % 60 | 0, millis = Math.round(ms % 1000)
    return `${min}:${sec.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`
  }

  async getSolvesByEvent(): Promise<{ [event: string]: Solve[] }> {
    if (!this.db) return {}
    const solves: SerializedSolve[] = await this.db.getAll("solves")

    return solves.reduce<{ [event: string]: Solve[] }>((solves, value) => {
      const { event, solve } = deserializeSolve(value);
      (solves[event] = solves[event] ?? []).push(solve)
      return solves
    }, {})
  }

  start(time = performance.now()) {
    this.started = true

    this.time = 0
    this.memoTime = 0
    this.startTime = time

    clearInterval(this.interval)
    this.interval = setInterval(() => this.time = performance.now() - this.startTime, 67)

    if (process.env.VUE_APP_GA_ID) track("event", "game", "start", this.eventName)
  }

  scramble() {
    this.reset(true)
    this.game.scramble()
    this.game.canvas.focus()

    this.scrambled = true
    this.scrambledBoard = this.game.board.clone()

    if (this.event == EventType.Blind) this.start()

    if (process.env.VUE_APP_GA_ID) track("event", "game", "scramble", this.eventName)
  }

  async reset(onlyResetState = false) {
    clearInterval(this.interval)

    this.started = false
    this.scrambled = false
    this.inSolvingPhase = false
    this.dnf = false
    this.moveHistory = []
    this.undos = 0
    this.time = 0
    this.memoTime = 0
    this.inspecting = false
    this.newRecord = null

    if (this.sessionSolves[this.eventName] == null) {
      this.sessionSolves[this.eventName] = []
    }
    this.solves = this.sessionSolves[this.eventName] || []

    vue.$emit("reset")

    if (onlyResetState) return

    this.game.setBoardSize(this.cols, this.rows)
    this.game.setBlind(false)

    if (this.game.noRegrips = this.noRegrips) {
      this.game.activeTile = this.game.board.grid[Math.floor((this.rows - 1) / 2)][Math.floor((this.cols - 1) / 2)]
    }

    if (this.db) {
      this.allSolves = (await this.db.getAllFromIndex("solves", "event", this.eventName))
        .map(value => Object.freeze(deserializeSolve(value).solve)) || []
      this.updateAverages()
    }
  }

  done() {
    this.game.setBlind(false)
    this.dnf = !this.game.board.isSolved()
    this.handleSolved()
  }

  undo(all = false) {
    if (this.undos == this.moveHistory.length) return
    const move = this.moveHistory[this.moveHistory.length - this.undos - 1]
    this.game.animatedMove({ ...move, n: -move.n })
    this.undos += 1
    if (all && this.undoable) this.undo(true)
  }

  redo(all = false) {
    if (this.undos == 0) return
    const move = this.moveHistory[this.moveHistory.length - this.undos]
    this.game.animatedMove(move)
    this.undos -= 1
    if (all && this.redoable) this.redo(true)
  }

  inspect(solve: Solve) {
    this.reset(true)
    this.inspecting = true
    this.replaying = false
    this.startTime = solve.startTime
    this.time = solve.time
    this.dnf = !!solve.dnf

    this.game.setBoard(solve.scramble.clone())
    this.moveHistory = solve.moves
    this.undos = solve.moves.length

    this.hideInspectHint = true

    if (process.env.VUE_APP_GA_ID) track("event", "game", "inspect")
  }

  async replay(replay = true) {
    if (process.env.VUE_APP_GA_ID) track("event", "game", "replay", replay ? "start" : "pause")

    if (!replay) this.replaying = false
    if (!this.redoable || this.replaying || !replay) return

    const speed = this.replaySpeed
    const startTime = performance.now() - this.moveHistory[this.moveHistory.length - this.undos].time! / speed

    this.replaying = true

    clearInterval(this.interval)
    this.interval = setInterval(() => this.time = (performance.now() - startTime) * speed, 87)
    this.time = (performance.now() - startTime) * speed

    while (this.undos != 0) {
      const move = this.moveHistory[this.moveHistory.length - this.undos]
      const diff = move.time! / speed - performance.now() + startTime
      if (diff > 0) await new Promise(resolve => setTimeout(resolve, diff))
      if (!this.replaying) break
      if (this.animations) this.game.transitionTime = this.transitionTime / speed
      this.redo()
    }

    if (this.animations) this.game.transitionTime = this.transitionTime
    clearInterval(this.interval)
    this.replaying = false
  }

  changeSize(size: number) {
    this.custom = false
    this.rows = size
    this.cols = size
  }

  handleMove(move: Move, isPlayerMove: boolean) {
    const time = performance.now()

    if (!this.started && this.scrambled && isPlayerMove) this.start(time)
    if (!this.started) return

    this.scrambled = !this.game.board.isSolved()
    if (!isPlayerMove) return

    if (this.undos > 0) {
      this.moveHistory.splice(this.moveHistory.length - this.undos, this.undos)
      this.undos = 0
    }

    for (let i = Math.abs(move.n); i--;) {
      this.moveHistory.push(Object.freeze({ ...move, n: Math.sign(move.n), time: Math.floor(time - this.startTime) }))
    }

    if (this.event == EventType.Blind) {
      if (!this.inSolvingPhase) {
        this.inSolvingPhase = true
        this.game.setBlind(true)
        this.memoTime = performance.now() - this.startTime
      }
    } else if (this.event != EventType.Fmc && !this.scrambled) {
      this.handleSolved(true)
    }
  }

  handleSolved(useLastMoveTime = false) {
    clearInterval(this.interval)

    this.time = useLastMoveTime
      ? this.moveHistory[this.moveHistory.length - 1].time!
      : performance.now() - this.startTime

    this.started = false
    this.scrambled = false
    this.inSolvingPhase = false

    const solve: Solve = {
      startTime: Math.floor(Date.now() - this.time),
      time: Math.floor(this.time),
      moves: [...this.moveHistory],
      scramble: this.scrambledBoard!
    }

    if (this.memoTime > 0) solve.memoTime = Math.floor(this.memoTime)
    if (this.dnf) solve.dnf = true

    this.solves.push(Object.freeze(solve))
    this.allSolves.push(solve)

    const averageOfNumbers = [1, 3, 5]
    const lastAverages = averageOfNumbers.map(n => this.averages.get(n))

    this.newRecord = null

    setTimeout(() => this.updateAverages().then(() => {
      for (const [i, averageOf] of averageOfNumbers.entries()) {
        const average = this.averages.get(averageOf)
        const lastAverage = lastAverages[i]
        if (!average || !lastAverage) break

        if (this.event == EventType.Fmc && average.fewestMoves > -1 && average.fewestMoves < lastAverage.fewestMoves) {
          this.newRecord = { averageOf, difference: lastAverage.fewestMoves - average.fewestMoves, fmc: true }
          break
        } else if (this.event != EventType.Fmc && average.bestTime > -1 && average.bestTime < lastAverage.bestTime) {
          this.newRecord = { averageOf, difference: lastAverage.bestTime - average.bestTime, fmc: false }
          break
        }
      }
    }), 50)

    if (process.env.VUE_APP_GA_ID) track("event", "game", "solved", this.eventName)

    saveSolve(this, solve)
  }

  async updateAverages() {
    await new Promise(resolve => setTimeout(resolve, 50))
    this.averages = await calculateAverages(this)
  }

  syncSolves() {
    return syncSolves(this)
  }
}
