<template>
  <Dialog title="Settings" :open="open" @update:open="$emit('update:open', $event)">
    <label class="checkbox">
      <input v-model="$state.darkMode" type="checkbox" />
      <span>Dark mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.forceMobile" type="checkbox" />
      <span>Force mobile mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.darkText" type="checkbox" />
      <span>Dark text</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.boldText" type="checkbox" />
      <span>Use bold font</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.animations" type="checkbox" />
      <span>Enable animations</span>
    </label>

    <label class="label" v-if="$state.animations">Transition speed</label>
    <div class="slider-container" v-show="$state.animations">
      <Slider class="slider" :min="100" :max="200" :step="10" v-model="$state.transitionTime"/>
      <span>{{ $state.transitionTime }} ms</span>
    </div>

    <label class="label">Letter System</label>
    <select v-model="$state.letterSystem" class="input" style="margin-bottom: 16px;">
      <option value="numbers">Numbers</option>
      <option value="letters">Letters</option>
      <option value="letters-xy">XY Letters</option>
    </select>

    <div class="spacer" />

    <a @click="clearData('event')">Delete solves for current event</a>
    <a @click="clearData('all')">Clear all data</a>
    <a @click="exportSolves('csv')">Export solves as CSV</a>
    <a @click="exportSolves('json')">Export solves as JSON</a>

    <Dialog
      :title="clearType == 'all' ? 'Clear all data' : 'Delete all data for the current event'"
      :open.sync="clearDialog"
      @confirm="clearData(clearType, true)"
    >
      <p v-if="clearType == 'event'">All solves from the current event will be gone.</p>
      <p v-else>This will delete all data including solves and modifications to the settings.</p>
    </Dialog>
  </Dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator"
import Dialog from "./Dialog.vue"
import Slider from "./Slider.vue"
import { movesToString } from "../game"

@Component({
  components: {
    Slider,
    Dialog
  }
})
export default class SettingsDialog extends Vue {
  @Prop(Boolean) open!: boolean

  clearDialog = false
  clearType: "event" | "all" | null = null

  async clearData(type: "all" | "event", confirm = false) {
    if (confirm) {
      this.clearDialog = false
      if (type == "event") {
        const solvesStore = this.$state.db?.transaction("solves", "readwrite").objectStore("solves")
        if (solvesStore) {
          let cursor = await solvesStore.index("event").openKeyCursor(this.$state.eventName)
          if (!cursor) return
          do {
            solvesStore.delete(cursor.primaryKey)
          } while (cursor = await cursor.continue())
        }

        if (this.$state.user) {
          await fetch(process.env.VUE_APP_API + "/sync", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.$state.user.token}`
            },
            body: JSON.stringify(this.$state.allSolves.map(solve => solve.startTime))
          })
        }

        this.$state.reset()
        this.$emit("update:open", false)
      } else {
        indexedDB.deleteDatabase("loopover")
        localStorage.removeItem("loopover")
        localStorage.removeItem("loopoverUser")
        location.reload()
      }
      return
    }

    this.clearDialog = true
    this.clearType = type
  }

  async exportSolves(format: "csv" | "json") {
    if (!this.$state.db) return
    let data: string

    if (format == "csv") {
      data = "event,date,time,moves,memo_time,dnf\n"
      data += Object.entries(await this.$state.getSolvesByEvent())
        .map(([event, solves]) => solves.map(solve => {
          return [
            event, new Date(solve.startTime).toISOString(),
            solve.time, solve.moves.length, solve.memoTime || 0, !!solve.dnf
          ]
        }).join("\n")).flat().join("\n")
    } else {
      const solves = await this.$state.db!.getAll("solves")
      data = "[\n"
        + solves.map(solve => `  ${JSON.stringify({ ...solve, session: undefined })}`).join(",\n")
        + "\n]"
    }

    if (process.env.VUE_APP_GA_ID) track("event", "settings", "export", format)

    const url = URL.createObjectURL(new Blob([data], {
      type: format == "csv" ? "text/csv" : "application/json"
    }))

    const a = document.createElement("a")
    a.href = url
    a.download = `solves.${format}`
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
}

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

.slider-container {
  display: flex;
  align-items: center;
}

.slider {
  flex-grow: 1;
}

.slider-container span {
  font-size: 14px;
  margin: 0 0 0 16px;
  opacity: 0.6;
}

.spacer {
  margin-bottom: 15px;
  height: 1px;
}

a {
  display: block;
  margin: 16px 0;
}
</style>
