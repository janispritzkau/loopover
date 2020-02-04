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

    <div class="table-header">
      <h4>Averages</h4>
      <div class="btn-group">
        <button class="btn" :class="{ active: !showMoves }" @click="showMoves = false">Time</button>
        <button class="btn" :class="{ active: showMoves }" @click="showMoves = true">Moves</button>
      </div>
    </div>
    <table>
      <tr>
        <th style="width: 16%;">∑</th>
        <th style="width: 28%;">Worst</th>
        <th style="width: 28%;">Best</th>
        <th>Current</th>
      </tr>
      <tr v-for="avg in averages" :key="avg.n">
        <td>{{ avg.n }}</td>
        <td>{{ format(showMoves ? avg.mostMoves : avg.worstTime) }}</td>
        <td>{{ format(showMoves ? avg.fewestMoves : avg.bestTime) }}</td>
        <td>{{ format(showMoves ? avg.currentMoves : avg.currentTime) }}</td>
      </tr>
    </table>
    <LineChart v-if="$state.allSolves.length > 3" ref="chart" @loaded="renderChart"
      :styles="{ height: '320px', marginTop: '16px' }" />
  </section>
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator"
import { EventType } from '../state'
import { Line } from "vue-chartjs"

@Component({
  components: {
    LineChart: async () => Vue.extend({
      extends: (await import("vue-chartjs")).Line,
      mounted() {
        this.$emit("loaded")
      }
    })
  }
})
export default class Statistics extends Vue {
  showMoves = this.$state.event == EventType.Fmc

  $refs!: { chart: Line }

  @Watch("$state.event")
  handleEventTypeChange() {
    this.showMoves = this.$state.event == EventType.Fmc
  }

  get averages() {
    return [1, 3, 5, 12, 50, 100].map(n => ({ ...this.$state.averages.get(n), n }))
  }

  format(value?: number) {
    if (this.showMoves) {
      return value ? Math.round(value * 10) / 10 : "―"
    } else {
      return this.$state.formatTime(value)
    }
  }

  @Watch("$state.allSolves")
  @Watch("showMoves")
  renderChart() {
    if (!this.$refs.chart || this.$state.allSolves.length == 0) return

    let scores = this.$state.allSolves.map(solve => this.showMoves
      ? solve.moves.length : solve.time / 1000)
    scores.sort((a, b) => a - b)

    if (scores.length > 16) scores = scores.slice(0, -Math.max(8, Math.ceil(scores.length / 20)))

    const start = Math.floor(scores[0])
    const end = Math.ceil(scores[scores.length - 1])
    const step = Math.round(1 + 12 / scores.length + (end - start) / 32)

    const labels = [...Array(Math.ceil((end - start + step) / step))].map((_, i) => start + i * step)

    const data = labels.map(() => 0)
    for (const score of scores) {
      const x = score / step - start / step
      const f = x - ~~x
      data[~~x] += 1 / scores.length * (1 - f)
      data[~~x + Math.ceil(f)] += 1 / scores.length * f
    }

    this.$refs.chart.renderChart({
      labels,
      datasets: [
        {
          label: "You",
          data,
          backgroundColor: "rgb(43, 135, 209, 0.2)",
          borderColor: "rgb(43, 135, 209, 1)",
          fill: true
        }
      ]
    }, {
      tooltips: { enabled: false },
      animation: { duration: 0 },
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
          display: false,
          ticks: { beginAtZero: true }
        }]
      }
    })
  }
}
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

.table-header {
  display: flex;
  align-items: flex-end;
}

.table-header h4 {
  flex-grow: 1;
}

.btn-group {
  background: var(--contrast-3);
  border-radius: 14px;
  margin-bottom: 8px;
}

.btn {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: inherit;
}
</style>