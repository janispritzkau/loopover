<template>
  <div>
    <Solve
      v-for="(solve, i) in items"
      :key="i"
      :time="solve.time"
      :moves="solve.moves.length"
      :fmc="fmc"
      :dnf="solve.dnf"
      @click="!$state.started && $state.inspect(solve)"
    />
    <p v-if="solves.length == 0" style="opacity: 0.8;">No solves yet</p>
    <p v-if="showHint" class="hint">You can tap on a solve to inspect it</p>
    <button
      v-if="skip != null && solves.length - skip > currentLimit"
      class="btn"
      @click="currentLimit += 10"
    >Show older solves</button>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import Solve from "./Solve.vue"
import { Solve as SolveI } from '../state'

export default Vue.extend({
  components: {
    Solve
  },
  props: {
    solves: {
      type: Array as () => SolveI[],
      required: true
    },
    limit: {
      type: Number,
      default: 0
    },
    skip: Number,
    fmc: Boolean,
    inspectHint: Boolean
  },
  data() {
    return {
      currentLimit: this.limit
    }
  },
  watch: {
    limit() {
      this.currentLimit = this.limit
    }
  },
  computed: {
    items(): SolveI[] {
      if (this.currentLimit == 0) return []
      const skip = this.skip || 0

      return this.solves.slice(
        Math.max(0, this.solves.length - this.currentLimit - skip),
        this.solves.length - skip
      ).reverse()
    },
    showHint(): boolean {
      return this.inspectHint && !this.$state.hideInspectHint && this.solves.length >= 12 && this.items.length > 0
    }
  }
})
</script>

<style scoped>
.btn {
  display: block;
  margin: 16px auto;
}

.hint {
  opacity: 0.8;
}
</style>
