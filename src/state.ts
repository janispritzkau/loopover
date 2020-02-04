import Vue from "vue"
import { openDB, IDBPDatabase } from "idb"
import { Move, Board, Game } from "./game"
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
    return this.undos == this.moveHistory.length
  }

  get redoable() {
    return this.undos == 0
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
  }

  scramble() {
    this.reset(true)
    this.game.scramble()
    this.game.canvas.focus()

    this.scrambled = true
    this.scrambledBoard = this.game.board.clone()

    if (this.event == EventType.Blind) this.start()
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
      solvesStore.add(solve)
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
          body: JSON.stringify(chunk)
        })
      }
    }
  }

  done() {
    this.game.blind = false
    this.dnf = !this.game.board.isSolved()
    this.handleSolved()
  }

  undo() {
    if (this.undos == this.moveHistory.length) return
    const move = this.moveHistory[this.moveHistory.length - this.undos - 1]
    this.game.animatedMove(move.axis, move.index, -move.n)
    this.undos += 1
  }

  redo() {
    if (this.undos == 0) return
    const move = this.moveHistory[this.moveHistory.length - this.undos]
    this.game.animatedMove(move.axis, move.index, move.n)
    this.undos -= 1
  }

  inspect(solve: Solve) {
    this.reset(true)
    this.inspecting = true
    this.time = solve.time
    this.dnf = !!solve.dnf

    this.game.board = solve.scramble.clone()
    this.moveHistory = solve.moves
    this.undos = solve.moves.length
  }

  changeSize(size: number) {
    this.custom = false
    this.rows = size
    this.cols = size
    this.reset()
  }

  handleMove(move: Move, isPlayerMove: boolean) {
    if (!isPlayerMove) return

    // start game on first moves
    if (this.scrambled && !this.started) this.start()
    if (!this.started) return

    if (this.undos > 0) {
      this.moveHistory.splice(this.moveHistory.length - this.undos, this.undos)
      this.undos = 0
    }

    for (let i = Math.abs(move.n); i--;) {
      this.moveHistory.push({ ...move, n: Math.sign(move.n), time: Date.now() - this.startTime })
    }

    if (this.event == EventType.Blind) {
      if (!this.inSolvingPhase) {
        this.inSolvingPhase = true
        this.game.blind = true
        this.memoTime = Date.now() - this.startTime
      }
    } else if (this.game.board.isSolved()) {
      this.handleSolved()
    }
  }

  async handleSolved() {
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

    await Vue.nextTick()

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

    const serializedSolve = serializeSolve(solve, this.eventName, this.session)

    if (this.db) this.db.put("solves", serializedSolve)

    if (this.user) {
      fetch(process.env.VUE_APP_API + "/sync", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.user.token}`
        },
        body: JSON.stringify([serializedSolve])
      })
    }
  }

  newRecord: { n: number, diff: number, fmc: boolean } | null = null

  averages = new Map<number, {
    bestTime: number, worstTime: number, currentTime: number
    fewestMoves: number, mostMoves: number, currentMoves: number
  }>()

  calculateAverages() {
    function sum(array: number[][], index: number, start = 0, end = array.length) {
      let sum = 0
      for (let i = start; i < end; i++) {
        sum += array[i][index]
      }
      return sum
    }

    const solves = this.allSolves.map(s => [s.time, s.moves.length])
    this.averages = new Map()

    for (const n of [1, 3, 5, 12, 50, 100]) {
      if (solves.length < n) continue

      let bestTime = Infinity
      let worstTime = -Infinity

      let fewestMoves = Infinity
      let mostMoves = -Infinity

      const length = solves.length - n + 1
      for (let i = 0; i < length; i++) {
        const time = sum(solves, 0, i, i + n) / n
        if (time > worstTime) worstTime = time
        if (time < bestTime) bestTime = time

        const moves = sum(solves, 1, i, i + n) / n
        if (moves > mostMoves) mostMoves = moves
        if (moves < fewestMoves) fewestMoves = moves
      }

      this.averages.set(n, {
        worstTime, bestTime, currentTime: sum(solves, 0, solves.length - n) / n,
        fewestMoves, mostMoves, currentMoves: sum(solves, 1, solves.length - n) / n
      })
    }
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
      event: this.event
    }

    if (this.noRegrips) state.noRegrips = true
    if (this.darkText) state.darkText = true
    if (!this.useLetters) state.useLetters = false
    if (this.forceMobile) state.forceMobile = true
    if (this.darkMode) state.darkMode = true

    return state
  }
}

function serializeSolve(solve: Solve, event: string, session: number) {
  return {
    session, event, ...solve,
    scramble: solve.scramble.serialize()
  }
}

function deserializeSolve(value: any): { session: number, event: string, solve: Solve } {
  const { session, event, ...solve } = value
  return {
    session, event,
    solve: {
      ...solve, scramble: Board.deserialize(solve.scramble)
    }
  }
}

const state = new State()
const vue = new Vue({ data: state })

vue.$watch(() => state.allSolves, () => state.calculateAverages())

vue.$watch(() => [state.cols, state.rows, state.event, state.noRegrips], () => {
  state.cols = Math.floor(Math.min(Math.max(state.cols, 1), 50))
  state.rows = Math.floor(Math.min(Math.max(state.rows, 1), 50))

  state.game.setBoardSize(state.cols, state.rows)
  state.reset()
})

vue.$watch(() => [state.darkText, state.useLetters], () => {
  state.game.useLetters = state.useLetters
  state.game.darkText = state.darkText
})

state.loadFromLocalStorage()

vue.$watch(state.serialize, state => {
  localStorage.loopover = JSON.stringify(state)
}, { deep: true })

openDB("loopover", 2, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (oldVersion < 2) {
      if (db.objectStoreNames.contains("solves")) {
        transaction.objectStore("solves").name = "solvesOld"
      }

      const solvesStore = db.createObjectStore("solves", { keyPath: "startTime" })
      solvesStore.createIndex("session", "session", { unique: false })
      solvesStore.createIndex("event", "event", { unique: false })

      if (db.objectStoreNames.contains("solvesOld")) {
        const sessions = transaction.objectStore("sessions")

        let cursor = await transaction.objectStore("solvesOld").openCursor()
        while (cursor) {
          solvesStore.put({
            session: (await sessions.get(cursor.value.session)).created,
            event: cursor.value.event,
            ...cursor.value.solve,
            scramble: cursor.value.solve.scramble.grid
          })
          cursor = await cursor.continue()
        }

        db.deleteObjectStore("sessions")
        db.deleteObjectStore("solvesOld")
      }
    }
  }
}).then(async db => {
  state.db = db
  state.reset().then(() => state.syncSolves())
})

vue.$watch(() => state.auth.user, () => state.syncSolves())

export default state
