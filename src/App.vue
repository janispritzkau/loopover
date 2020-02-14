<template>
  <div class="app">
    <div class="main-container">
      <div class="main-wrapper" :class="{ desktopMode }">
        <h1>Loopover</h1>

        <main ref="main">
          <div v-if="!desktopMode" class="top">
            <Solve
              class="solve"
              current
              :time="$state.displayTime"
              :moves="$state.moves"
              :fmc="fmc"
              :dnf="$state.dnf"
            />
            <button class="btn" @click="handleMainButtonClick">{{ mainButtonText }}</button>
            <template v-if="$state.showUndoRedo">
              <div style="margin-left: 8px;" />
              <div class="fmc-top" :class="{ break: mainWidth < 360 }">
                <RepeatButton class="btn" @click="$state.undo(true)" :disabled="!$state.undoable">
                  Undo
                  <br />to start
                </RepeatButton>
                <RepeatButton class="btn" @click="$state.redo(true)" :disabled="!$state.redoable">
                  Redo
                  <br />to end
                </RepeatButton>
              </div>
              <RepeatButton class="btn" @click="$state.undo()" :disabled="!$state.undoable">Undo</RepeatButton>
              <RepeatButton class="btn" @click="$state.redo()" :disabled="!$state.redoable">Redo</RepeatButton>
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
            <RepeatButton class="btn" @click="$state.undo()" :disabled="!$state.undoable">Undo</RepeatButton>
            <RepeatButton class="btn" @click="$state.redo()" :disabled="!$state.redoable">Redo</RepeatButton>
            <RepeatButton
              class="btn"
              @click="$state.undo(true)"
              :disabled="!$state.undoable"
            >Undo to start</RepeatButton>
            <RepeatButton
              class="btn"
              @click="$state.redo(true)"
              :disabled="!$state.redoable"
            >Redo to end</RepeatButton>
          </div>

          <transition name="record">
            <p v-if="newRecord" class="new-record">{{ newRecord }}</p>
          </transition>

          <Solve
            class="current-solve"
            current
            :time="$state.displayTime"
            :moves="$state.moves"
            :fmc="fmc"
            :dnf="$state.dnf"
          />

          <SolveList :solves="$state.solves" :limit="sidebarLimit" :fmc="fmc" />
        </aside>
      </div>
    </div>

    <section
      v-if="$state.allSolves.length - $state.solves.length > 0 || $state.solves.length > sidebarLimit"
    >
      <transition name="record">
        <p v-if="!desktopMode && newRecord" class="new-record">{{ newRecord }}</p>
      </transition>

      <SolveList
        :solves="$state.allSolves"
        :skip="Math.min(sidebarLimit, $state.solves.length)"
        :limit="Math.min(Math.max($state.solves.length - sidebarLimit, 0), 10)"
        :fmc="fmc"
      />
    </section>

    <section v-else>
      <p>
        Tap
        <span style="font-size: 14px; font-weight: 600;">SCRAMBLE</span>
        and use your fingers, mouse or arrow keys to move the tiles back to their original place.
      </p>
    </section>

    <Statistics />

    <Footer />

    <div v-if="refresh" class="update-notification dark">
      <span>A new version is available. Please reload to update.</span>
      <button class="btn secondary" @click="refresh()">Reload</button>
      <button class="btn" @click="refresh = null">
        <svg width="20" viewBox="0 0 24 24">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>

    <Dialog
      title="Confirm scramble"
      :open.sync="confirmScrambleDialog"
      @confirm="$state.scramble()"
    >
      <p style="margin: 0;">Do you want to reset the current solve and generate a new scramble?</p>
    </Dialog>

    <EventDialog :open.sync="eventDialog" />
    <SettingsDialog :open.sync="settingsDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator"
import { Game, Move, Board } from "./game"

import Dialog from "./components/Dialog.vue"
import SettingsDialog from "./components/SettingsDialog.vue"
import EventDialog from "./components/EventDialog.vue"
import RepeatButton from "./components/RepeatButton.vue"
import SolveView from "./components/Solve.vue"
import SolveList from "./components/SolveList.vue"
import Statistics from "./components/Statistics.vue"
import Footer from "./components/Footer.vue"
import { EventType } from "./state"

@Component({
  components: {
    Solve: SolveView,
    SolveList,
    RepeatButton,
    Statistics,
    Footer,
    Dialog,
    EventDialog,
    SettingsDialog
  }
})
export default class App extends Vue {
  $refs!: {
    canvas: HTMLCanvasElement
    main: HTMLDivElement
  }

  refresh: Function | null = null

  confirmScrambleDialog = false
  eventDialog = false
  settingsDialog = false

  desktopMode = false
  sidebarWidth = 240
  sidebarLimit = 12
  mainWidth = 0

  get fmc() {
    return this.$state.event == EventType.Fmc
  }

  get eventName() {
    return `${this.$state.cols}×${this.$state.rows}`
      + ["", " FMC", " BLD"][this.$state.event]
      + (this.$state.noRegrips ? " NRG" : "")
  }

  get newRecord() {
    const record = this.$state.newRecord
    if (!record) return

    return record.n == 1
      ? `New personal best (-${record.fmc ? record.diff + "\xa0moves" : record.diff / 1000 + "s"})`
      : `New best average of ${record.n} (-${record.fmc
        ? Math.round(record.diff * 10) / 10 + "\xa0moves"
        : Math.round(record.diff) / 1000 + "s"})`
  }

  get mainButtonText() {
    return this.$state.inSolvingPhase || this.$state.started && !this.$state.scrambled
      ? "Done"
      : "Scramble"
  }

  handleMainButtonClick() {
    if (this.$state.inSolvingPhase || this.$state.started && !this.$state.scrambled) {
      this.$state.done()
    } else if (this.$state.started && this.fmc) {
      this.confirmScrambleDialog = true
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
    const mobileHeight = Math.max(150 + 150 / aspect, innerHeight - 32 * 3 - 96)

    const desktopWidth = this.$el.clientWidth - this.sidebarWidth - 32
    const desktopHeight = innerHeight - 32 * 3 - 48

    this.desktopMode = !this.$state.forceMobile
      // choose desktop mode if the canvas size is bigger than in mobile mode
      && (Math.min(mobileWidth / aspect, mobileHeight) < Math.min(desktopWidth / aspect, desktopHeight))
      && rows > 1
      && desktopHeight > 320 // minimum height of sidebar

    const width = this.desktopMode ? desktopWidth : mobileWidth
    const height = this.desktopMode ? desktopHeight : mobileHeight

    if (width / aspect < height) {
      game.setWidth(Math.min(width, cols * 50 + 250 * Math.max(aspect, 1)))
    } else {
      game.setHeight(Math.min(height, rows * 50 + 250 / Math.min(aspect, 1)))
    }

    this.mainWidth = Math.max(Math.min(mobileWidth, 320), game.width / devicePixelRatio)

    if (this.$refs.main) {
      this.$refs.main.style.width = `${this.mainWidth}px`
    }

    this.sidebarLimit = this.desktopMode
      ? ~~((game.height / devicePixelRatio - (this.$state.showUndoRedo ? 200 : 150)) / 36)
      : 0
  }

  mounted() {
    window.app = this

    this.$watch(() => this.$state.darkMode, dark => {
      document.body.classList.toggle("dark", dark)
    }, { immediate: true })

    const game = new Game(this.$refs.canvas, this.$state.cols, this.$state.rows)
    this.$state.game = game
    game.onMove = this.$state.handleMove.bind(this.$state)

    window.addEventListener("keydown", event => {
      if (event.ctrlKey || event.shiftKey) return

      if (document.activeElement == document.body) {
        game.handleKeyDown(event)
        if (event.defaultPrevented) game.canvas.focus()
      } else if (document.activeElement != game.canvas) {
        return
      }

      switch (event.key) {
        case "u": this.$state.showUndoRedo && this.$state.undo(); break
        case "r": this.$state.showUndoRedo && this.$state.redo(); break
        case "Enter": this.handleMainButtonClick(); break
        default: return
      }

      game.canvas.focus()
    })

    window.addEventListener("resize", this.updateSize.bind(this))
    this.updateSize()
  }
}
</script>

<style scoped>
.app {
  overflow-x: hidden;
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

main {
  transition: width 0.2s;
}

canvas {
  display: block;
  margin: 0 auto;
  border-radius: 3px;
  outline: 0;
  transition: all 0.2s;
  touch-action: none;
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

.btn {
  flex-shrink: 0;
}

.btn.filled {
  width: 100%;
  height: 48px;
  margin-bottom: 16px;
}

.top .solve {
  flex-grow: 1;
  min-width: 0;
}

.fmc-top {
  position: absolute;
  right: 0;
  bottom: 44px;
}

.fmc-top:not(.break) br {
  display: none;
}

.fmc-top .btn {
  height: auto;
  min-height: 36px;
  padding: 6px 8px;
}

.fmc-button-wrapper {
  display: flex;
  flex-wrap: wrap;
  margin-top: -8px;
}

.fmc-button-wrapper .btn {
  width: 50%;
  padding: 0;
  margin-bottom: 8px;
}

.current-solve {
  margin-bottom: 12px;
}

.new-record {
  font-size: 18px;
  font-weight: 500;
  color: var(--green);
  margin: 0 0 8px;
  display: inline-block;
}

.record-enter-active {
  transition: all 0.6s;
}

.record-leave-active {
  transition: opacity 0.2s;
}

.record-enter {
  transform: translateY(-40px) scale(1.2);
  opacity: 0;
}

.record-leave-to {
  opacity: 0;
}

section {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: content-box;
}

section::before {
  content: "";
  display: block;
  margin-bottom: 32px;
}

section::after {
  content: "";
  display: block;
  margin-top: 31px;
  border-bottom: 1px solid var(--contrast-2);
}
</style>
