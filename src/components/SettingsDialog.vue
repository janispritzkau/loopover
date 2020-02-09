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

    <label class="label">Transition speed</label>
    <div class="btn-group">
      <button v-for="t in [130, 150, 170]"
        class="btn"
        :class="{ active: $state.transitionTime == t }"
        @click="$state.transitionTime = t"
        :key="t">
        {{ t }}ms
      </button>
    </div>

    <button class="btn export" @click="exportSolves">Export solves as CSV</button>
    <button class="btn" @click="clear('event')">Clear solves for current event</button>
    <button class="btn" @click="clear('all')">Clear all data</button>

    <Dialog :open.sync="confirmDialog" @confirm="clear(clearWhat, true)">
      <h3>Delete all data{{ clearWhat == "event" ? " for the current event" : "" }}</h3>
      <p v-if="clearWhat == 'event'">All solves from the current event will be gone.</p>
      <p v-else>This will delete all data including solves and modifications to the settings.</p>
    </Dialog>
  </Dialog>
</template>

<script lang="ts">
import Vue from "vue"
import Dialog from "./Dialog.vue"
import { movesToString } from "../game"

export default Vue.extend({
  components: {
    Dialog
  },
  props: {
    open: Boolean
  },
  data() {
    return {
      confirmDialog: false,
      clearWhat: null as any
    }
  },
  methods: {
    async clear(what: "all" | "event", confirm = false) {
      if (confirm) {
        this.confirmDialog = false
        if (what == "event") {
          const solvesStore = this.$state.db?.transaction("solves", "readwrite").objectStore("solves")
          if (solvesStore) {
            let cursor = await solvesStore.index("event").openKeyCursor(this.$state.eventName)
            if (!cursor) return
            do {
              solvesStore.delete(cursor.primaryKey)
            } while (cursor = await cursor.continue())
          }
        } else if (what == "all") {
          indexedDB.deleteDatabase("loopover")
          localStorage.removeItem("loopover")
          location.reload()
        }
        return
      }

      this.confirmDialog = true
      this.clearWhat = what
    },
    async exportSolves() {
      let text = "event,time,moves,dnf,memo_time,moves_alg,scramble\n"

      text += Object.entries(await this.$state.getSolvesByEvent())
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
.btn {
  display: block;
  margin-top: 4px;
}

.btn-group .btn {
  margin: 0;
  text-transform: none;
}

.label {
  margin-top: 16px;
}
</style>