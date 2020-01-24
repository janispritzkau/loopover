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
  </section>
</template>

<script lang="ts">
import { Vue, Component, Watch } from "vue-property-decorator"
import { EventType } from '../state'

@Component({})
export default class Stats extends Vue {
  showMoves = this.$state.event == EventType.Fmc

  @Watch("$state.event")
  handleEventTypeChange() {
    this.showMoves = this.$state.event == EventType.Fmc
  }

  get averages() {
    return [1, 3, 5, 12, 50].map(n => ({ ...this.$state.averages.get(n), n }))
  }

  format(value?: number) {
    if (this.showMoves) {
      return value ? Math.round(value * 10) / 10 : "―"
    } else {
      return this.$state.formatTime(value)
    }
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
  margin-bottom: 4px;
}

.btn {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: inherit;
}
</style>