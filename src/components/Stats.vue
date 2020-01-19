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
      return [1, 3, 5, 12].map(n => {
        if (this.$state.solves.length < n) return { n }
        let best = Infinity
        let worst = -Infinity
        let current = this.$state.solves.slice(-n).reduce((a, x) => a + x.time, 0) / n

        const length = this.$state.solves.length - n + 1
        for (let i = 0; i < length; i++) {
          const solves = this.$state.solves.slice(i, i + n)
          const time = solves.reduce((a, x) => a + x.time, 0) / n
          if (time > worst) worst = time
          if (time < best) best = time
        }

        return { n, best, worst, current }
      })
    }
  }
})
</script>
