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
    <LineChart
      v-if="showChart"
      ref="chart"
      :width="300"
      :height="200"
      @loaded="renderChart"
      :styles="{ marginTop: '32px' }"
    />
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
  showChart = false

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

  @Watch("$state.darkMode")
  @Watch("$state.allSolves")
  @Watch("showMoves")
  async renderChart() {
    const response = await fetch(`${process.env.VUE_APP_API}/statistics/${this.$state.eventName}/${this.showMoves ? "moves" : "time"}`)
    const { labels, data } = await response.json()

    this.showChart = labels.length > 1
    if (!this.$refs.chart || !this.showChart) return

    let scores = this.$state.allSolves.map(solve => this.showMoves
      ? solve.moves.length : solve.time / 1000)

    const start = labels[0]
    const step = labels[1] - labels[0]

    let you = labels.map(() => 0)

    for (const score of scores) {
      const pos = score / step - start / step
      const frac = pos - ~~pos
      you[~~pos] += 1 / scores.length * (1 - frac)
      you[~~pos + Math.ceil(frac)] += 1 / scores.length * frac
    }

    const dark = this.$state.darkMode || undefined

    this.$refs.chart.renderChart({
      labels,
      datasets: [
        {
          label: "You",
          data: you,
          backgroundColor: "rgb(50, 140, 210, 0.22)",
          borderColor: "rgb(50, 140, 210, 1)",
          fill: true
        },
        {
          label: "Average user",
          data: data,
          backgroundColor: "rgb(50, 140, 210, 0.22)",
          borderColor: "rgb(0, 0, 0, 0)",
          fill: true
        }
      ]
    }, {
      tooltips: { enabled: false },
      animation: { duration: 0 },
      legend: { labels: { fontColor: dark && "rgba(255, 255, 255, 0.9)" } },
      scales: {
        ...dark && {
          xAxes: [{
            ticks: {
              fontColor: "rgba(255, 255, 255, 0.7)"
            },
            gridLines: {
              color: "rgba(255, 255, 255, 0.06)",
              zeroLineColor: "rgba(255, 255, 255, 0.1)"
            },
          }]
        },
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
</style>
