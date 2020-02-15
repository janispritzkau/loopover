import Vue from "vue"
import { openDB, IDBPDatabase } from "idb"
import { Move, Board, Game, Axis } from "./game"
import * as auth from "./auth"

export enum EventType {
  Normal = 0,
  Fmc = 1,
  Blind = 2
}

export interface Solve {
  time: number
  moves: Move[]
  scramble: Board
  startTime: number
  memoTime?: number
  dnf?: boolean
}

export interface SerializedSolve {
  event: string
  session: number
  startTime: number
  time: number
  moves: number[][]
  scramble: number[][]
  memoTime?: number
  dnf?: boolean
}

export interface StoredState {
  version: number
  cols: number
  rows: number
  event: EventType
  noRegrips?: boolean
  darkMode?: boolean
  forceMobile?: boolean
  useLetters?: boolean
  darkText?: boolean
  wrapAround?: boolean
  transitionTime: number
  hideInspectHint?: boolean
}

export class State {
  cols = 5
  rows = 5
  custom = false
  event = EventType.Normal
  noRegrips = false

  darkMode = false
  forceMobile = false
  useLetters = true
  darkText = false
  wrapAround = true
  transitionTime = 150
  hideInspectHint = false

  /** Timer is running */
  started = false
  /** Is a generated scramble */
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

  solves: Solve[] = []
  allSolves: Solve[] = []
  sessionSolves: { [event: string]: Solve[] } = {}

  db?: IDBPDatabase
  session = Date.now()

  game!: Game

  auth = auth.state

  get user() {
    return auth.state.user
  }

  get eventName() {
    return `${state.cols}x${state.rows}`
      + ["", "-fmc", "-bld"][state.event]
      + (state.noRegrips ? "-nrg" : "")
  }

  get displayTime() {
    if (this.inspecting) {
      return this.moveHistory[this.moveHistory.length - this.undos]?.time ?? this.time
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
    return this.undos != this.moveHistory.length
  }

  get redoable() {
    return this.undos != 0
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
    const solves: any[] = await this.db?.getAll("solves")

    return solves.reduce<{ [event: string]: Solve[] }>((solves, value) => {
      const { event, solve } = deserializeSolve(value);
      (solves[event] = solves[event] ?? []).push(solve)
      return solves
    }, {})
  }

  start() {
    this.started = true

    this.time = 0
    this.memoTime = 0
    this.startTime = Date.now()

    this.interval = setInterval(() => {
      this.time = Date.now() - this.startTime
    }, 87)

    if (process.env.VUE_APP_GA_ID) ga("send", "event", "game", "start", this.eventName)
  }

  scramble() {
    this.reset(true)
    this.game.scramble()
    this.game.canvas.focus()

    this.scrambled = true
    this.scrambledBoard = this.game.board.clone()

    if (this.event == EventType.Blind) this.start()

    if (process.env.VUE_APP_GA_ID) ga("send", "event", "game", "scramble", this.eventName)
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
    this.game.blind = false

    if (this.game.noRegrips = this.noRegrips) {
      this.game.activeTile = this.game.board.grid[Math.floor((this.rows - 1) / 2)][Math.floor((this.cols - 1) / 2)]
    }

    if (this.db) {
      this.allSolves = (await this.db.getAllFromIndex("solves", "event", this.eventName))
        .map(value => Object.freeze(deserializeSolve(value).solve)) || []
    }
  }

  async syncSolves() {
    if (!this.user || !this.db) return

    const response = await fetch(process.env.VUE_APP_API + "/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.user.token}`
      },
      body: JSON.stringify(await this.db.getAllKeys("solves"))
    })

    const { solves, missing } = await response.json()
    const solvesStore = this.db.transaction("solves", "readwrite").objectStore("solves")

    for (const solve of solves) {
      solvesStore.add({ ...solve, moves: serializeMoves(solve.moves) })
    }

    this.allSolves = (await solvesStore.index("event").getAll(this.eventName))
      .map(value => Object.freeze(deserializeSolve(value).solve)) || []

    if (missing.length > 0) {
      const solves = await Promise.all(missing.map((id: any) => solvesStore.get(id)))
      let syncChunks: any[][] = [[]]
      let length = 0

      for (const solve of solves) {
        const solveLen = JSON.stringify(solve).length
        if ((length += solveLen) > 128 * 1024) {
          syncChunks.push([solve])
          length = solveLen
        } else {
          syncChunks[syncChunks.length - 1].push(solve)
        }
      }

      for (const chunk of syncChunks) {
        await fetch(process.env.VUE_APP_API + "/sync", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.user.token}`
          },
          body: JSON.stringify(chunk.map(solve => ({ ...solve, moves: deserializeMoves(solve.moves)})))
        })
      }
    }
  }

  done() {
    this.game.blind = false
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
    this.time = solve.time
    this.dnf = !!solve.dnf

    this.game.board = solve.scramble.clone()
    this.moveHistory = solve.moves
    this.undos = solve.moves.length

    this.hideInspectHint = true

    if (process.env.VUE_APP_GA_ID) ga("send", "event", "game", "inspect")
  }

  changeSize(size: number) {
    this.custom = false
    this.rows = size
    this.cols = size
  }

  handleMove(move: Move, isPlayerMove: boolean) {
    // start game on first moves
    if (isPlayerMove && this.scrambled && !this.started) this.start()
    if (!this.started) return

    if (!isPlayerMove) {
      this.scrambled = !this.game.board.isSolved()
      return
    }

    if (this.undos > 0) {
      this.moveHistory.splice(this.moveHistory.length - this.undos, this.undos)
      this.undos = 0
    }

    for (let i = Math.abs(move.n); i--;) {
      this.moveHistory.push({ ...move, n: Math.sign(move.n), time: Date.now() - this.startTime })
    }

    this.scrambled = true

    if (this.event == EventType.Blind) {
      if (!this.inSolvingPhase) {
        this.inSolvingPhase = true
        this.game.blind = true
        this.memoTime = Date.now() - this.startTime
      }
    } else if (this.game.board.isSolved()) {
      if (this.event == EventType.Fmc) {
        this.scrambled = false
      } else {
        this.handleSolved()
      }
    }
  }

  handleSolved() {
    clearInterval(this.interval)

    this.time = Date.now() - this.startTime
    this.started = false
    this.scrambled = false
    this.inSolvingPhase = false

    const solve: Solve = {
      startTime: this.startTime,
      time: this.time,
      moves: [...this.moveHistory],
      scramble: this.scrambledBoard!
    }

    if (this.memoTime > 0) solve.memoTime = this.memoTime
    if (this.dnf) solve.dnf = true

    this.solves.push(Object.freeze(solve))
    this.allSolves.push(solve)

    const averageNums = [1, 3, 5]
    const lastAverages = averageNums.map(n => this.averages.get(n))
    this.newRecord = null

    const unwatch = vue.$watch(() => [this.averages], () => {
      for (const [i, n] of averageNums.entries()) {
        const average = this.averages.get(n)
        const lastAverage = lastAverages[i]
        if (!average || !lastAverage) break

        if (this.event == EventType.Fmc && average.fewestMoves < lastAverage.fewestMoves) {
          this.newRecord = { n, diff: lastAverage.fewestMoves - average.fewestMoves, fmc: true }
          break
        } else if (this.event != EventType.Fmc && average.bestTime < lastAverage.bestTime) {
          this.newRecord = { n, diff: lastAverage.bestTime - average.bestTime, fmc: false }
          break
        }
      }
      unwatch()
    })

    if (process.env.VUE_APP_GA_ID) ga("send", "event", "game", "solved", this.eventName)

    const serializedSolve = serializeSolve(solve, this.eventName, this.session)

    if (this.db) this.db.put("solves", serializedSolve)

    if (this.user) {
      fetch(process.env.VUE_APP_API + "/sync", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.user.token}`
        },
        body: JSON.stringify([{ ...serializedSolve, moves: solve.moves }])
      })
    }
  }

  newRecord: { n: number, diff: number, fmc: boolean } | null = null

  averages = new Map<number, {
    bestTime: number, worstTime: number, currentTime: number
    fewestMoves: number, mostMoves: number, currentMoves: number
  }>()

  async calculateAverages() {
    const average = (array: number[]) => {
      array.sort((a, b) => a - b)
      const m = array.length > 2 ? Math.ceil(array.length / 20) : 0
      let sum = 0
      for (let i = m; i < array.length - m; i++) {
        sum += array[i]
      }
      return sum / (array.length - m * 2)
    }

    const times = this.allSolves.map(s => s.time)
    const moves = this.allSolves.map(s => s.moves.length)

    for (const n of [1, 3, 5, 12, 50, 100]) {
      if (times.length < n) {
        this.averages.delete(n)
        continue
      }

      let bestTime = Infinity
      let worstTime = -Infinity

      let fewestMoves = Infinity
      let mostMoves = -Infinity

      const length = times.length - n + 1

      for (let i = 0; i < length; i++) {
        if (i % 128 == 0) await new Promise(resolve => setTimeout(resolve, 1))

        const time = average(times.slice(i, i + n))
        if (time > worstTime) worstTime = time
        if (time < bestTime) bestTime = time

        const avgMoves = average(moves.slice(i, i + n))
        if (avgMoves > mostMoves) mostMoves = avgMoves
        if (avgMoves < fewestMoves) fewestMoves = avgMoves
      }

      this.averages.set(n, {
        worstTime, bestTime, currentTime: average(times.slice(-n)),
        fewestMoves, mostMoves, currentMoves: average(moves.slice(-n))
      })

    }

    this.averages = new Map(this.averages)
  }

  applyGameSettings() {
    this.game.useLetters = this.useLetters
    this.game.darkText = this.darkText
    this.game.wrapAround = this.wrapAround
    this.game.transitionTime = this.transitionTime
  }

  loadFromLocalStorage() {
    if (!localStorage.loopover) return

    const state = JSON.parse(localStorage.loopover) as StoredState
    if (state.version != 0) return

    const { cols, rows, event, ...rest } = state

    this.cols = cols
    this.rows = rows
    this.custom = this.cols != this.rows || this.cols > 10 && this.cols != 20
    this.event = event

    for (let [key, value] of Object.entries(rest)) {
      if (value != null) (this as any)[key] = value
    }
  }

  serialize() {
    const state: StoredState = {
      version: 0,
      cols: this.cols,
      rows: this.rows,
      event: this.event,
      transitionTime: this.transitionTime
    }

    if (this.noRegrips) state.noRegrips = true
    if (this.darkText) state.darkText = true
    if (!this.useLetters) state.useLetters = false
    if (this.forceMobile) state.forceMobile = true
    if (this.darkMode) state.darkMode = true
    if (!this.wrapAround) state.wrapAround = false
    if (this.hideInspectHint) state.hideInspectHint = true

    return state
  }
}

function serializeMoves(moves: Move[]) {
  let lastTime = 0
  return moves.map(move => {
    const time = move.time! - lastTime
    lastTime = move.time!
    return [+(move.axis == Axis.Col), move.index, move.n, time]
  })
}

function deserializeMoves(moves: number[][]) {
  let lastTime = 0
  return moves.map<Move>(move => ({
    axis: move[0] ? Axis.Col : Axis.Row, index: move[1], n: move[2],
    time: (lastTime += move[3]) - move[3]
  }))
}

function serializeSolve(solve: Solve, event: string, session: number): SerializedSolve {
  return {
    event, session, ...solve,
    moves: serializeMoves(solve.moves),
    scramble: solve.scramble.serialize()
  }
}

function deserializeSolve(value: SerializedSolve): { event: string, session: number, solve: Solve } {
  const { event, session, ...solve } = value
  return {
    event, session, solve: {
      ...solve,
      moves: deserializeMoves(solve.moves),
      scramble: Board.deserialize(solve.scramble)
    }
  }
}

const state = new State()
export const vue = new Vue({ data: state })

vue.$watch(() => state.allSolves, () => state.calculateAverages())

vue.$watch(() => [state.cols, state.rows, state.event, state.noRegrips], () => {
  state.cols = Math.floor(Math.min(Math.max(state.cols, 1), 50))
  state.rows = Math.floor(Math.min(Math.max(state.rows, 1), 50))

  state.game.setBoardSize(state.cols, state.rows)
  state.reset()
})

vue.$watch(() => [state.darkMode, state.darkText, state.useLetters, state.wrapAround, state.transitionTime], () => {
  state.applyGameSettings()
})

state.loadFromLocalStorage()

vue.$watch(state.serialize, state => {
  localStorage.loopover = JSON.stringify(state)
}, { deep: true })

openDB("loopover", 4, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (oldVersion == 1) {
      db.deleteObjectStore("sessions")
      db.deleteObjectStore("solves")
    }
    if (oldVersion < 2) {
      const solves = db.createObjectStore("solves", { keyPath: "startTime" })
      solves.createIndex("session", "session", { unique: false })
      solves.createIndex("event", "event", { unique: false })
    }
    if (oldVersion < 4) {
      let cursor = await transaction.objectStore("solves").openCursor()
      while (cursor) {
        cursor.update({
          ...cursor.value,
          moves: serializeMoves(cursor.value.moves)
        })
        cursor = await cursor.continue()
      }
    }
  }
}).then(async db => {
  if (!IDBObjectStore.prototype.getAll) return
  state.db = db
  state.reset().then(() => state.syncSolves())
})

vue.$watch(() => state.auth.user, () => state.syncSolves())

export default state
