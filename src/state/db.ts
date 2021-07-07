import { openDB, IDBPDatabase } from "idb"
import { Solve, State, EventType } from "."
import { Move, Axis, Board } from '../game'

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

export type LoopoverDB = IDBPDatabase<{
  solves: {
    key: number
    value: SerializedSolve
    indexes: {
      event: string
      session: number
    }
  }
}>

export interface Settings {
  version: number
  cols: number
  rows: number
  event: EventType
  noRegrips?: boolean
  darkMode?: boolean
  forceMobile?: boolean
  letterSystem?: string
  darkText?: boolean
  boldText?: boolean
  transitionTime: number
  hideInspectHint?: boolean
}

export function loadSettings(state: State, settings: Settings) {
  if (settings.version != 0) return

  const { cols, rows, event, ...rest } = settings

  state.cols = cols
  state.rows = rows
  state.custom = state.cols != state.rows || state.cols > 10 && state.cols != 20
  state.event = event

  for (let [key, value] of Object.entries(rest)) (state as any)[key] = value
}

export function saveSettings(state: State) {
  const settings: Settings = {
    version: 0,
    cols: state.cols,
    rows: state.rows,
    event: state.event,
    letterSystem: state.letterSystem,
    transitionTime: state.transitionTime
  }

  if (state.noRegrips) settings.noRegrips = true
  if (state.darkText) settings.darkText = true
  if (state.boldText) settings.boldText = true
  if (state.forceMobile) settings.forceMobile = true
  if (state.darkMode) settings.darkMode = true
  if (state.hideInspectHint) settings.hideInspectHint = true

  return settings
}

export function serializeSolve(solve: Solve, event: string, session: number): SerializedSolve {
  return {
    event, session, ...solve,
    moves: serializeMoves(solve.moves),
    scramble: solve.scramble.serialize()
  }
}

export function deserializeSolve(value: SerializedSolve): { event: string, session: number, solve: Solve } {
  const { event, session, ...solve } = value
  return {
    event, session, solve: {
      ...solve,
      moves: deserializeMoves(solve.moves),
      scramble: Board.deserialize(solve.scramble)
    }
  }
}

export async function saveSolve(state: State, solve: Solve) {
  const serializedSolve = serializeSolve(solve, state.eventName, state.session)

  if (state.db) state.db.put("solves", serializedSolve)

  if (state.user) {
    fetch(process.env.VUE_APP_API + "/sync", {
      method: "PUT",
      headers: {
        "api-version": "1",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.user.token}`
      },
      body: JSON.stringify([serializedSolve])
    })
  }
}

export async function syncSolves(state: State) {
  const db = state.db
  const token = state.user?.token

  if (!db || !token) return

  const response = await fetch(process.env.VUE_APP_API + "/sync", {
    method: "POST",
    headers: {
      "api-version": "1",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(await db.getAllKeys("solves"))
  })
  if (!response.ok) return

  const { solves, missing } = await response.json()
  const solvesStore = db.transaction("solves", "readwrite").objectStore("solves")

  for (const solve of solves) solvesStore.add(solve)

  state.allSolves = (await solvesStore.index("event").getAll(state.eventName))
    .map(value => Object.freeze(deserializeSolve(value).solve)) || []

  if (missing.length > 0) {
    const solves = await Promise.all((missing as any[]).map(id => solvesStore.get(id))) as SerializedSolve[]
    let syncChunks: SerializedSolve[][] = [[]]
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
      const response = await fetch(process.env.VUE_APP_API + "/sync", {
        method: "PUT",
        headers: {
          "api-version": "1",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(chunk)
      })
      if (!response.ok) return
    }
  }
}

export const openDatabase = () => openDB<any>("loopover", 4, {
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
})

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
    time: (lastTime += move[3])
  }))
}
