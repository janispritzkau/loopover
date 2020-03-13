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
    <LineChart ref="timeChart" :width="500" :height="300" :styles="{ margin: '32px 0 0 -8px' }" />
  </section>
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator"
import { EventType } from '../state'
import { Line } from "vue-chartjs"
import { Chart } from "chart.js"
import { average } from '../state/averages'

const gridLines = (dark?: boolean) => ({
  ...dark && {
    color: "rgba(255, 255, 255, 0.08)",
    zeroLineColor: "rgba(255, 255, 255, 0.14)"
  }
})

const fontColor = (dark?: boolean) => ({
  ...dark && {
    fontColor: "rgba(255, 255, 255, 0.8)"
  }
})

@Component({
  components: {
    LineChart: Line
  }
})
export default class Statistics extends Vue {
  showMoves = false

  $refs!: {
    timeChart: Line
  }

  get averages() {
    return [1, 3, 5, 12, 50, 100].map(n => ({ ...this.$state.averages.get(n), n }))
  }

  format(value?: number) {
    if (value == -1) return "DNF"
    if (this.showMoves) {
      return value ? Math.round(value * 10) / 10 : "―"
    } else {
      return this.$state.formatTime(value)
    }
  }

  renderTimeChart() {
    if (!this.$refs.timeChart) return

    const showMoves = this.showMoves
    const dark = this.$state.darkMode || undefined
    const scores = this.$state.allSolves.slice(-212).map((solve, i) => ({
      x: i, y: showMoves ? solve.moves.length : solve.time
    }))

    let averages = scores.length > 1 ? scores.map((score, i) => {
      return [12, 5, 1].map(n => {
        const y = i < n - 1 ? -1 : average(new Int32Array(scores.slice(i - n + 1, i + 1).map(x => x.y)))
        return {
          x: score.x,
          y: y != -1 ? showMoves ? y : y / 1000 : undefined
        }
      })
    }) : []

    averages = averages.slice(-200)

    this.$refs.timeChart.renderChart({
      datasets: [12, 5, 1].map((n, i) => ({
        label: n == 1 ? "Single" : `Ao${n}`,
        data: averages.map(x => x[i]),
        borderColor: ["rgb(80, 180, 80)", "rgb(215, 75, 75)", "rgba(115, 120, 125, 0.4)"][i],
        pointRadius: 0,
        pointHoverRadius: 0,
        lineTension: 0.3,
        borderWidth: [2, 1.8, 1.2][i],
        fill: false,
      }))
    }, {
      tooltips: { enabled: false },
      animation: { duration: 0 },
      legend: { labels: fontColor(dark) },
      scales: {
        xAxes: [{
          type: "linear",
          ticks: {
            display: false,
            min: averages.length > 0 ? averages[0][0].x : 0,
            max: averages.length > 0 ? averages[averages.length - 1][0].x : 1,
          },
          gridLines: gridLines(dark)
        }],
        yAxes: [{
          ticks: {
            maxTicksLimit: 7,
            ...fontColor(dark)
          },
          gridLines: gridLines(dark)
        }]
      }
    })
  }

  mounted() {
    this.$watch(() => this.$state.event == EventType.Fmc, showMoves => {
      this.showMoves = showMoves
    }, { immediate: true })

    this.$watch(() => [this.$state.darkMode, this.$state.allSolves, this.showMoves], () => {
      setTimeout(this.renderTimeChart, 300)
    }, { immediate: true })
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
