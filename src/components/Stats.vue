<template>
  <section>
    <h3>Statistics</h3>
    <div class="cards">
      <div class="card">
        <h5>Session solves</h5>
        {{ $state.solves.length }}
      </div>
      <div class="card">
        <h5>Total solves</h5>
        {{ $state.allSolves.length }}
      </div>
    </div>

    <h4>Averages</h4>
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
      return [1, 3, 5, 12, 50].map(n => ({ ...this.$state.averages.get(n), n }))
    }
  }
})
</script>

<style scoped>
.cards {
  display: flex;
  margin: 0 -4px;
}

.card {
  width: 50%;
  margin: 4px;
}
</style>