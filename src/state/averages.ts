import { State } from "./state"

export function average(array: Int32Array) {
  array.sort()
  const m = array.length > 3 ? Math.ceil(array.length / 20) : 0
  let sum = 0
  for (let i = m; i < array.length - m; i++) {
    if (array[i] == -1) return -1
    sum += array[i]
  }
  return sum / (array.length - m * 2)
}

export interface AvgScores {
  bestTime: number
  worstTime: number
  currentTime: number
  fewestMoves: number
  mostMoves: number
  currentMoves: number
}

export async function calculateAverages(state: State) {
  const times = new Int32Array(state.allSolves.map(s => s.dnf ? -1 : s.time))
  const moves = new Int32Array(state.allSolves.map(s => s.dnf ? -1 : s.moves.length))

  const averages = new Map<number, AvgScores>()

  for (const n of [1, 3, 5, 12, 50, 100]) {
    if (times.length < n) continue

    let bestTime = Infinity
    let worstTime = -1

    let fewestMoves = Infinity
    let mostMoves = -1

    for (let i = 0; i < times.length - n + 1; i++) {
      const time = average(times.slice(i, i + n))
      if (time > worstTime) worstTime = time
      if (time != -1 && time < bestTime) bestTime = time

      const avgMoves = average(moves.slice(i, i + n))
      if (avgMoves > mostMoves) mostMoves = avgMoves
      if (avgMoves != -1 && avgMoves < fewestMoves) fewestMoves = avgMoves
    }

    if (bestTime == Infinity) bestTime = -1
    if (fewestMoves == Infinity) fewestMoves = -1

    averages.set(n, {
      worstTime, bestTime, currentTime: average(times.slice(-n)),
      fewestMoves, mostMoves, currentMoves: average(moves.slice(-n))
    })

  }

  return averages
}
