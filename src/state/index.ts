import Vue from "vue"
import { State } from "./state"
import { openDatabase, loadSettings, saveSettings } from "./db"
import { Board, Move } from "../game"

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

export const state = new State()
export const vue = new Vue({ data: state })

openDatabase().then(async db => {
  if (!IDBObjectStore.prototype.getAll) return
  state.db = db
  state.reset().then(() => state.syncSolves())
})

vue.$watch(() => state.auth.user, () => state.syncSolves())

if (localStorage.loopover) {
  loadSettings(state, JSON.parse(localStorage.loopover))
}

vue.$watch(() => saveSettings(state), settings => {
  localStorage.loopover = JSON.stringify(settings)
}, { deep: true })

vue.$nextTick(() => {
  vue.$watch(() => [state.cols, state.rows, state.event, state.noRegrips], () => {
    state.cols = Math.floor(Math.min(Math.max(state.cols, 1), 50))
    state.rows = Math.floor(Math.min(Math.max(state.rows, 1), 50))

    state.game.setBoardSize(state.cols, state.rows)
    state.reset()
  }, { immediate: true })

  vue.$watch(() => [state.darkText, state.useLetters, state.wrapAround, state.transitionTime], () => {
    state.game.darkText = state.darkText
    state.game.useLetters = state.useLetters
    state.game.wrapAround = state.wrapAround
    state.game.transitionTime = state.transitionTime
  }, { immediate: true })
})

export * from "./state"
