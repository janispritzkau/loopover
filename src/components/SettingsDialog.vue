<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <h3>Settings</h3>
    <label class="checkbox">
      <input v-model="$state.darkMode" type="checkbox" />
      <span>Dark mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.forceMobile" type="checkbox" />
      <span>Force mobile mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.useLetters" type="checkbox" />
      <span>Use letters</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.darkText" type="checkbox" />
      <span>Dark text</span>
    </label>
    <button
      v-if="Object.keys($state.eventSolves).length > 0"
      class="btn export"
      @click="exportSolves"
    >Export solves as CSV</button>
  </Dialog>
</template>

<script lang="ts">
import Vue from "vue"
import Dialog from "./Dialog.vue"
import { movesToString } from '../game'

export default Vue.extend({
  components: {
    Dialog
  },
  props: {
    open: Boolean
  },
  methods: {
    exportSolves() {
      let text = "event,time,moves,dnf,memo_time,scramble,moves_alg\n"

      text += Object.entries(this.$state.eventSolves)
        .map(([event, solves]) => solves.map(solve => {
          return [
            event, solve.time, solve.moves.length, !!solve.dnf, solve.memoTime || 0,
            movesToString(solve.moves), solve.scramble.grid.flat().join(" ")
          ]
        }).join("\n")).flat().join("\n")

      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "solves.csv"
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }
})
</script>

<style scoped>
.export {
  margin: 16px 0 0;
}
</style>