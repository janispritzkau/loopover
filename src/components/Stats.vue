<template>
  <section>
    <h3>Averages</h3>
    <table>
      <tr>
        <th>∑</th>
        <th>Best</th>
        <th>Worst</th>
        <th>Current</th>
      </tr>
      <tr v-for="{ n, best, worst, current } in averages" :key="n">
        <td>{{ n }}</td>
        <td>{{ $state.formatTime(best) }}</td>
        <td>{{ $state.formatTime(worst) }}</td>
        <td>{{ $state.formatTime(current) }}</td>
      </tr>
    </table>
  </section>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  computed: {
    averages() {
      const solves = this.$state.solves.map(s => s.time)
      return [1, 3, 5, 12, 50].map(n => {
        if (solves.length < n) return { n }
        let best = Infinity
        let worst = -Infinity
        let current = sum(solves, solves.length - n) / n

        const length = solves.length - n + 1
        for (let i = 0; i < length; i++) {
          const time = sum(solves, i, i + n) / n
          if (time > worst) worst = time
          if (time < best) best = time
        }

        return { n, best, worst, current }
      })
    }
  }
})

function sum(array: number[], start = 0, end = array.length) {
  let sum = 0
  for (let i = start; i < end; i++) {
    sum += array[i]
  }
  return sum
}
</script>
