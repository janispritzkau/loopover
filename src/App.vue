<template>
  <div id="app">
    <div class="main-container">
      <div class="main-wrapper" :style="{ margin: margin + 'px' }">
        <main>
          <div v-if="!desktopMode" style="height: 0; display: flex; align-items: flex-end; transform: translateY(-6px);" :style="{ marginTop: '48px' }">
            <CurrentSolve :dnf="state.dnf" :time="state.time" :moves="state.moveHistory.length - state.undoCount" :fmc="state.event == 1" style="flex-grow: 1;" />
            <button v-if="state.event == 1" @click="state.undo" :disabled="state.undoCount >= state.moveHistory.length">Undo</button>
            <button v-if="state.event == 1" @click="state.redo" :disabled="state.undoCount == 0">Redo</button>
            <button @click="state.inSolvingPhase ? state.done() : state.scramble()" :disabled="state.event == 2 && state.gameStarted && !state.inSolvingPhase">
              {{ state.event == 2 && state.gameStarted ? "Done" : "Scramble" }}
            </button>
          </div>
          <canvas ref="canvas"/>
          <div style="display: flex; height: 0px; transform: translateY(6px);" :style="{ marginBottom: '36px' }">
            <button @click="eventDialog = true">Event: {{state.cols}}×{{state.rows}} {{ state.noRegrips ? "NRG" : "" }} {{ getEventName(state.event) }}</button>
            <div style="flex-grow: 1;"/>
            <button @click="optionsDialog = true">Options</button>
          </div>
        </main>
        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button @click="state.inSolvingPhase ? state.done() : state.scramble()" :disabled="state.event == 2 && state.gameStarted && !state.inSolvingPhase" class="sidebar-button">
            {{ state.event == 2 && state.gameStarted ? "Done" : "Scramble" }}
          </button>
          <div v-if="state.event == 1" style="margin-bottom: 16px; display: flex;">
            <button @click="state.undo" style="flex-grow: 1;" :disabled="state.undoCount >= state.moveHistory.length">Undo</button>
            <button @click="state.redo" style="flex-grow: 1;" :disabled="state.undoCount == 0">Redo</button>
          </div>
          <CurrentSolve :dnf="state.dnf" :time="state.time" :moves="state.moveHistory.length - state.undoCount" :fmc="state.event == 1" style="margin-bottom: 8px;" />
          <SolveList :solves="state.solves" :max="sidebarSolvesNum" :fmc="state.event == 1"/>
        </aside>
      </div>
    </div>
    <section v-if="!desktopMode || sidebarSolvesNum < 8">
      <SolveList v-if="state.solves.length > 0" :solves="state.solves" :fmc="state.event == 1"/>
      <div v-else style="opacity: 0.8;">No solves yet</div>
    </section>
    <Dialog :open.sync="eventDialog">
      <h3>Event</h3>
      <div style="display: flex; margin-bottom: 16px;">
        <div style="width: 50%; padding-right: 8px;">
          <label>Cols</label>
          <input class="input" type="number" v-model.number.lazy="state.cols" :min="2" :max="50">
        </div>
        <div style="flex-grow: 1; padding-left: 8px;">
          <label>Rows</label>
          <input class="input" type="number" v-model.number.lazy="state.rows" :min="2" :max="50">
        </div>
      </div>
      <label>Event type</label>
      <select v-model.number="state.event" style="margin-bottom: 16px;">
        <option :value="0">Normal</option>
        <option :value="1">Fewest move count</option>
        <option :value="2">Blind</option>
      </select>
      <label>
        <input type="checkbox" v-model="state.noRegrips">
        No Regrips
      </label>
    </Dialog>
    <Dialog :open.sync="optionsDialog">
      <h3>Options</h3>
      <label>
        <input type="checkbox" v-model="state.forceMobile">
        Force mobile mode
      </label>
      <label>
        <input type="checkbox" v-model="state.useLetters">
        Use letters
      </label>
      <label>
        <input type="checkbox" v-model="state.darkText">
        Dark text
      </label>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Game, Move, Solve, Board } from './game'
import Dialog from "@/components/Dialog.vue"
import SolveList from "@/components/SolveList.vue"
import CurrentSolve from "@/components/CurrentSolve.vue"
import { State } from '@/state'

enum EventType {
  Normal = 0,
  Fmc = 1,
  Blind = 2,
  NoRegrip = 3
}

@Component({ components: { Dialog, SolveList, CurrentSolve } })
export default class App extends Vue {
  game!: Game
  state = new State

  desktopMode = false
  margin = 16
  minMargin = 16
  sidebarWidth = 192
  sidebarSolvesNum = 12

  eventDialog = false
  optionsDialog = false

  getEventName(type: EventType) {
    switch (type) {
      case EventType.Normal: return ""
      case EventType.Fmc: return "FMC"
      case EventType.Blind: return "BLD"
      case EventType.NoRegrip: return "NRG"
    }
  }

  formatTime(ms: number) {
    if (ms == null) return "-"
    const s = ms / 1000
    const min = (s / 60) | 0, sec = s % 60 | 0, mil = ms % 1000 | 0
    return `${min}:${sec.toString().padStart(2, "0")}.${mil.toString().padStart(3, "0")}`
  }

  @Watch('state.cols')
  @Watch('state.rows')
  @Watch('state.forceMobile')
  @Watch('margin')
  updateSize() {
    const { cols, rows } = this.game
    const w = this.$el.clientWidth, h = innerHeight
    this.minMargin = w / cols > 96 ? 24 : 16
    const width = w - this.minMargin * 2
    const desktopHeight = h - (this.minMargin * 2 + 36)
    const mobileHeight = h - (this.minMargin * 2 + 36 + 48)
    const desktopWidth = width - this.sidebarWidth

    if (this.state.forceMobile) {
      this.desktopMode = false
    } else {
      // enable desktop mode if the canvas size is bigger than in mobile mode
      this.desktopMode = Math.min(width / cols * rows, mobileHeight) < Math.min(desktopWidth / cols * rows, desktopHeight)
    }

    const height = this.desktopMode ? desktopHeight : mobileHeight
    const canvasWidth = this.desktopMode ? desktopWidth : width
    const canvasHeight = canvasWidth / cols * rows
    const aspectRatio = cols / rows

    if (canvasHeight < height) {
      const maxWidth = cols * 56 + 256 * (aspectRatio > 1 ? aspectRatio : 1)
      this.game.setWidth(Math.min(canvasWidth, maxWidth))
    } else {
      const maxHeight = rows * 56 + 256 / (aspectRatio < 1 ? aspectRatio : 1)
      this.game.setHeight(Math.min(height, maxHeight))
    }
    this.margin = this.game.height / this.game.dpr < height - 32 ? 32 : this.minMargin
    this.sidebarSolvesNum = ((this.game.height / this.game.dpr - 96) / 40) | 0
  }

  mounted() {
    this.game = new Game(this.$refs.canvas as any)
    this.state.init(this.game)
    
    if (document.fonts) document.fonts.ready.then(() => this.game.render())
    else setTimeout(() => this.game.render(), 50)
    this.updateSize()
    addEventListener("resize", this.updateSize.bind(this))

    window.app = this, window.game = this.game, window.state = this.state
  }
}
</script>

<style scoped>
#app {
  font-family: 'Roboto', sans-serif;
  color: rgba(0, 0, 0, 0.8);
}

.main-container {
  min-height: 75vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: #f4f4f4;
  box-sizing: content-box;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.05);
}

.main-wrapper {
  display: flex;
}

canvas {
  display: block;
  border-radius: 2px;
  outline: 0;
}

aside {
  width: 240px;
  padding: 2px 0 0 16px;
  box-sizing: border-box;
}

.sidebar-button {
  display: block;
  width: 100%;
  height: 40px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.1);
}
.sidebar-button:active {
  background: rgba(0, 0, 0, 0.2);
}

.current-time {
  font-size: 24px;
  font-weight: 500;
}

.current-moves, .moves {
  opacity: 0.8;
}

section {
  max-width: 480px;
  margin: 32px auto;
  padding: 0 16px;
}

h3 {
  margin: 0 0 16px;
}
</style>
