<template>
  <div class="app" :class="{ dark: $state.darkMode }">
    <div class="main-container">
      <div class="main-wrapper" :class="{ desktopMode }">
        <h1>Loopover</h1>

        <main :style="{ width: mainWidth + 'px' }">
          <div v-if="!desktopMode" class="top">
            <Solve
              current
              :time="$state.displayTime"
              :moves="$state.moves"
              :fmc="fmc"
              :dnf="$state.dnf"
              style="flex-grow: 1; min-width: 0;"
            />
            <button class="btn" @click="handleMainButtonClick">{{ mainButtonText }}</button>
            <template v-if="$state.showUndoRedo">
              <RepeatButton class="btn undo" @click="$state.undo()" :disabled="$state.undoable">Undo</RepeatButton>
              <RepeatButton class="btn" @click="$state.redo()" :disabled="$state.redoable">Redo</RepeatButton>
            </template>
          </div>

          <canvas ref="canvas" />

          <div class="bottom">
            <button class="btn" @click="eventDialog = true">Event: {{ eventName }}</button>
            <div style="flex-grow: 1;"></div>
            <button class="btn" @click="settingsDialog = true">Settings</button>
          </div>
        </main>

        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button class="btn filled" @click="handleMainButtonClick">{{ mainButtonText }}</button>
          <div v-if="$state.showUndoRedo" class="fmc-button-wrapper">
            <RepeatButton class="btn" @click="$state.undo()" :disabled="$state.undoable">Undo</RepeatButton>
            <RepeatButton class="btn" @click="$state.redo()" :disabled="$state.redoable">Redo</RepeatButton>
          </div>
          <Solve
            class="current-solve"
            current
            :time="$state.displayTime"
            :moves="$state.moves"
            :fmc="fmc"
            :dnf="$state.dnf"
          />
          <SolveList :limit="sidebarLimit" />
        </aside>
      </div>
    </div>

    <section v-if="!desktopMode">
      <SolveList />
    </section>

    <Stats />

    <footer>
      <p>
        Created by
        <a target="_blank" href="https://twitter.com/janispritzkau">Janis Pritzkau</a>.
        Remake of carykh's
        <a
          target="_blank"
          href="https://openprocessing.org/sketch/580366"
        >Loopover</a>.
      </p>
      <p>
        <a target="_blank" href="https://discord.gg/DXASrTp">discord.gg/DXASrTp</a> |
        <a target="_blank" href="https://github.com/janispritzkau/loopover">Source code</a>
      </p>
    </footer>

    <div v-if="refresh" class="update-notification">
      A new version is available. Please refresh to update.
      <button
        class="btn secondary"
        @click="refresh"
      >Refresh</button>
    </div>

    <EventDialog :open.sync="eventDialog" />
    <SettingsDialog :open.sync="settingsDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator"
import { Game, Move, Board } from "./game"

import SettingsDialog from "./components/SettingsDialog.vue"
import EventDialog from "./components/EventDialog.vue"
import RepeatButton from "./components/RepeatButton.vue"
import SolveView from "./components/Solve.vue"
import SolveList from "./components/SolveList.vue"
import Stats from "./components/Stats.vue"
import { EventType } from "./state"

@Component({
  components: {
    Solve: SolveView,
    SolveList,
    RepeatButton,
    Stats,
    EventDialog,
    SettingsDialog
  }
})
export default class App extends Vue {
  refresh: Function | null = null

  eventDialog = false
  settingsDialog = false

  desktopMode = false
  sidebarWidth = 240
  sidebarLimit = 12

  mainWidth = 320

  get fmc() {
    return this.$state.event == EventType.Fmc
  }

  get eventName() {
    return `${this.$state.cols}×${this.$state.rows}`
      + ["", " FMC", " BLD"][this.$state.event]
      + (this.$state.noRegrips ? " NRG" : "")
  }

  get mainButtonText() {
    return this.$state.inSolvingPhase ? "Done" : "Scramble"
  }

  handleMainButtonClick() {
    if (this.$state.inSolvingPhase) {
      this.$state.done()
    } else {
      this.$state.scramble()
    }
  }

  @Watch("$state.cols")
  @Watch("$state.rows")
  @Watch("$state.showUndoRedo")
  @Watch("$state.forceMobile")
  updateSize() {
    const { game } = this.$state
    const { cols, rows } = this.$state.game
    const aspect = cols / rows

    const mobileWidth = this.$el.clientWidth - 32
    const mobileHeight = Math.max(100 + 100 / aspect, innerHeight - 32 * 3 - 96)

    const desktopWidth = this.$el.clientWidth - this.sidebarWidth - 32
    const desktopHeight = innerHeight - 32 * 3 - 48

    this.desktopMode = !this.$state.forceMobile
      // choose desktop mode if the canvas size is bigger than in mobile mode
      && Math.min(mobileWidth / aspect, mobileHeight) < Math.min(desktopWidth / aspect, desktopHeight)
      && desktopHeight > 320 // minimum height of sidebar

    const width = this.desktopMode ? desktopWidth : mobileWidth
    const height = this.desktopMode ? desktopHeight : mobileHeight

    if (width / aspect < height) {
      game.setWidth(Math.min(width, cols * 50 + 200 * Math.max(aspect, 1)))
    } else {
      game.setHeight(Math.min(height, rows * 50 + 200 / Math.min(aspect, 1)))
    }

    this.mainWidth = Math.max(Math.min(mobileWidth, 320), game.width / devicePixelRatio)
    this.sidebarLimit = ~~((game.height / devicePixelRatio - (this.$state.showUndoRedo ? 160 : 120)) / 36)
  }

  mounted() {
    window.app = this

    const game = new Game(this.$refs.canvas as HTMLCanvasElement, this.$state.cols, this.$state.rows)
    this.$state.game = game
    this.$state.reset()
    game.onMove = this.$state.handleMove.bind(this.$state)

    window.addEventListener("resize", this.updateSize.bind(this))
    this.$nextTick(this.updateSize)
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  color: var(--contrast);
  background: var(--background);
}

.main-container {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  background: var(--background-darker);
  box-shadow: 0 -2px 0 var(--contrast-3) inset;
}

.main-wrapper {
  position: relative;
  display: flex;
  margin: 32px 0;
  padding-bottom: 32px;
  padding-top: 96px;
}

.main-wrapper.desktopMode {
  padding-top: 48px;
}

h1 {
  position: absolute;
  top: -8px;
  font-weight: 900;
  font-size: 30px;
  margin: 0 0 4px;
}

canvas {
  display: block;
  margin: 0 auto;
  border-radius: 3px;
  outline: 0;
  transition: all 0.3s;
}

aside {
  padding: 0 0 0 16px;
}

.top {
  height: 0;
  display: flex;
  align-items: flex-end;
  transform: translateY(-8px);
}

.bottom {
  height: 0;
  transform: translateY(8px);
  display: flex;
}

.btn.undo {
  margin-left: 8px;
}

.btn.filled {
  width: 100%;
  height: 48px;
  margin-bottom: 16px;
}

.fmc-button-wrapper {
  display: flex;
  margin-bottom: 16px;
}

.fmc-button-wrapper .btn {
  width: 50%;
}

.current-solve {
  margin-bottom: 12px;
}

section,
footer {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 16px 0;
  box-sizing: content-box;
}

section::after {
  content: "";
  display: block;
  padding-top: 31px;
  border-bottom: 1px solid var(--contrast-2);
}

footer {
  opacity: 0.9;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  padding: 16px 16px;
}
</style>
