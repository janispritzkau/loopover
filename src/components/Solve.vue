<template>
  <div
    class="solve"
    :class="{ fmc: fmc, current: current, clickable: $listeners.click }"
    @click="$emit('click', $event)"
  >
    <div class="first">{{ fmc ? movesStr : timeStr }}{{ dnf ? " DNF" : "" }}</div>
    <div class="second">{{ fmc ? timeStr : movesStr }} / {{ mps }} mps</div>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
export default Vue.extend({
  props: {
    time: Number,
    moves: Number,
    fmc: Boolean,
    dnf: Boolean,
    current: Boolean
  },
  computed: {
    mps() {
      return this.time && Math.round(Math.max(0, this.moves - 1) / this.time * 100000) / 100
    },
    timeStr() {
      return this.$state.formatTime(this.time)
    },
    movesStr() {
      return `${this.moves} moves`
    }
  }
})
</script>

<style scoped>
.solve {
  display: flex;
  white-space: nowrap;
}

.solve.clickable {
  cursor: pointer;
  transition: background 100ms;
}

.solve.clickable:active {
  background: var(--contrast-2);
}

.solve:not(.current) {
  padding: 8px 0;
}

.current {
  display: block;
}

.solve > * {
  overflow: hidden;
  text-overflow: ellipsis;
}

.first {
  font-weight: 500;
  flex-grow: 1;
  flex-shrink: 0;
  margin-right: 8px;
}

.current .first {
  font-size: 24px;
  line-height: 28px;
  margin: 0;
}

.second {
  opacity: 0.8;
}
</style>
