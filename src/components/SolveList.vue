<template>
  <div>
    <Solve
      v-for="(solve, i) in solves"
      :key="i"
      :time="solve.time"
      :moves="solve.moves.length"
      :fmc="solve.fmc"
      :dnf="solve.dnf"
      @click="!$state.started && $state.inspect(solve)"
    />
    <p v-if="$state.solves.length == 0" style="opacity: 0.8;">No solves yet</p>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import Solve from "./Solve.vue"

export default Vue.extend({
  components: {
    Solve
  },
  props: {
    limit: {
      type: Number,
      default: 0
    }
  },
  computed: {
    solves() {
      return this.$state.solves.slice(-this.limit).reverse()
    }
  }
})
</script>
