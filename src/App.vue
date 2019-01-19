<template>
  <div id="app">
    <div class="main-container">
      <div class="main-wrapper">
        <main>
          <div v-if="!desktopMode" style="height: 0; display: flex; align-items: flex-end;">
            <div style="flex-grow: 1; margin-bottom: 6px;">
              <div class="current-time">{{ formatTime(time) }}</div>
              <div class="current-moves">{{ moves }} moves</div>
            </div>
            <button @click="scramble" :disabled="isScrambled" style="margin-bottom: 4px;">Scramble</button>
          </div>
          <canvas ref="canvas"/>
          <div style="display: flex; padding-top: 4px;" :style="{height: desktopMode ? '24px' : '0'}">
            <button @click="eventDialog = true">Event: {{cols}}×{{rows}}</button>
            <div style="flex-grow: 1;"/>
            <button @click="optionsDialog = true">Options</button>
          </div>
        </main>
        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button @click="scramble" :disabled="isScrambled" class="sidebar-button">Scramble</button>
          <div class="current-time">{{ formatTime(time) }}</div>
          <div class="current-moves" style="margin-bottom: 16px;">{{ moves }} moves</div>
          <SolveList :solves="solves" :max="sidebarSolvesNum"/>
        </aside>
      </div>
    </div>
    <section v-if="!desktopMode">
      <SolveList v-if="solves.length > 0" :solves="solves"/>
      <div v-else style="opacity: 0.8;">No solves yet</div>
    </section>
    <Dialog :open.sync="eventDialog">
      <h3>Event</h3>
      <div style="display: flex;">
        <div style="width: 50%; padding-right: 8px;">
          <label>Cols</label>
          <input class="input" type="number" v-model.number.lazy="cols" :min="2" :max="50">
        </div>
        <div style="flex-grow: 1; padding-left: 8px;">
          <label>Rows</label>
          <input class="input" type="number" v-model.number.lazy="rows" :min="2" :max="50">
        </div>
      </div>
    </Dialog>
    <Dialog :open.sync="optionsDialog">
      <h3>Options</h3>
      <label>
        <input type="checkbox" v-model="forceMobile">
        Force mobile mode
      </label>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Game, Move, Solve } from './game'
import Dialog from "./components/Dialog.vue"
import SolveList from "./components/SolveList.vue"

@Component({ components: { Dialog, SolveList } })
export default class App extends Vue {
  game!: Game
  cols = 3
  rows = 3

  desktopMode = false
  sidebarWidth = 200
  sidebarSolvesNum = 12
  forceMobile = false
  eventDialog = false
  optionsDialog = false
  
  gameStarted = false
  isScrambled = false
  startTime = 0
  time = 0
  moves = 0
  interval!: number

  solves: Solve[] = []

  formatTime(ms: number) {
    if (ms == null) return "-"
    const s = ms / 1000
    const min = (s / 60) | 0, sec = s % 60 | 0, mil = ms % 1000 | 0
    return `${min}:${sec.toString().padStart(2, "0")}:${mil.toString().padStart(3, "0")}`
  }

  scramble() {
    this.game.scramble()
    this.isScrambled = true
  }

  startGame() {
    this.gameStarted = true
    this.moves = this.time = 0
    this.startTime = Date.now()
    this.interval = setInterval(() => {
      this.time = Date.now() - this.startTime
    }, 87)
  }

  onMove(move: Move) {
    if (this.isScrambled && !this.gameStarted) this.startGame()
    if (!this.gameStarted) return
    this.moves += Math.abs(move.n)
    if (this.game.board.isSolved()) this.onSolved()
  }

  onSolved() {
    clearInterval(this.interval)
    this.time = Date.now() - this.startTime
    this.isScrambled = false
    this.gameStarted = false
    this.game.pointers.clear()
    this.solves.push({ time: this.time, moves: this.moves })
  }


  setSize(cols: number, rows?: number) {
    this.cols = cols
    this.rows = rows || cols
  }

  @Watch('cols')
  @Watch('rows')
  @Watch('forceMobile')
  onBoardSizeChange() {
    this.cols = Math.min(Math.max(this.cols, 2), 50)
    this.rows = Math.min(Math.max(this.rows, 2), 50)
    this.game.setBoardSize(this.cols, this.rows)
    this.updateSize()
    this.solves = []
    this.isScrambled = this.gameStarted = false
    this.time = this.moves = 0
  }

  updateSize() {
    const width = this.$el.clientWidth - 32
    this.desktopMode = this.forceMobile ? false : width - this.sidebarWidth > 380
    const height = innerHeight - (this.desktopMode ? 80 : 128)
    const canvasWidth = this.desktopMode ? width - this.sidebarWidth : width
    const aspectRatio = this.cols / this.rows

    if (canvasWidth * (this.rows / this.cols) < height) {
      const maxWidth = this.cols * 64 + 256 * (aspectRatio > 1 ? aspectRatio : 1)
      this.game.setWidth(Math.min(canvasWidth, maxWidth))
    } else {
      const maxHeight = this.rows * 64 + 256 / (aspectRatio < 1 ? aspectRatio : 1)
      this.game.setHeight(Math.min(height, maxHeight))
    }
    this.sidebarSolvesNum = ((this.game.height / this.game.dpr - 96) / 40) | 0
  }

  mounted() {
    this.game = new Game(this.$refs.canvas as any)
    this.game.onMove = this.onMove.bind(this)

    addEventListener("resize", this.updateSize.bind(this))
    this.onBoardSizeChange()
    
    if (document.fonts) document.fonts.ready.then(() => this.game.render())
    else setTimeout(() => this.game.render(), 50)

    window.app = this, window.game = this.game
  }
}
</script>

<style scoped>
#app {
  font-family: 'Roboto', sans-serif;
  color: rgba(0, 0, 0, 0.8);
  padding-bottom: 320px;
}

.main-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f4;
  box-sizing: content-box;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.main-wrapper {
  display: flex;
}

canvas {
  display: block;
  border-radius: 2px;
}

aside {
  width: 240px;
  min-height: 320px;
  padding: 2px 0 0 24px;
  box-sizing: border-box;
}

.sidebar-button {
  display: block;
  width: 100%;
  height: 40px;
  margin-bottom: 20px;
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

.solve {
  display: flex;
  margin: 0 auto;
  margin-bottom: 8px;
  max-width: 240px;
}

.solve .time {
  font-weight: 500;
  flex-grow: 1;
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
