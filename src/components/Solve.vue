<template>
  <div
    class="solve"
    :class="{ fmc: fmc, current: current, clickable: $listeners.click }"
    @click="$emit('click', $event)"
  >
    <div class="time">{{ $state.formatTime(time) + (dnf && ' DNF' || '') }}</div>
    <div class="moves">{{ moves }} moves</div>
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
  }
})
</script>

<style scoped>
.solve {
  display: flex;
  flex-direction: row;
  white-space: nowrap;
}

.solve.clickable {
  cursor: pointer;
  transition: background 100ms;
}

.solve.clickable:active {
  background: var(--contrast-2);
}

.solve.fmc {
  flex-direction: row-reverse;
}

.solve:not(.current) {
  padding: 8px 0;
}

.current {
  flex-direction: column;
}

.current.fmc {
  flex-direction: column-reverse;
}

:not(.fmc) > .time,
.fmc .moves {
  font-weight: 500;
  flex-grow: 1;
  flex-shrink: 0;
  margin-right: 8px;
}

.current:not(.fmc) > .time,
.current.fmc .moves {
  font-size: 24px;
  line-height: 28px;
}

:not(.fmc) > .moves,
.fmc .time {
  overflow: hidden;
  opacity: 0.8;
  text-overflow: ellipsis;
}
</style>
