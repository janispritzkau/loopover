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
            <button>5×5 Sighted</button>
            <div style="flex-grow: 1;"/>
            <button>Options</button>
          </div>
        </main>
        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button @click="scramble" :disabled="isScrambled" class="sidebar-button">Scramble</button>
          <div class="current-time">{{ formatTime(time) }}</div>
          <div class="current-moves" style="margin-bottom: 16px;">{{ moves }} moves</div>
          <div v-for="(solve, i) in solves.slice(-5).reverse()" :key="i" class="solve">
            <div class="time">{{ formatTime(solve.time) }}</div>
            <div class="moves">{{ solve.moves }} moves</div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Game, Move, Solve } from './game'

@Component
export default class App extends Vue {
  game!: Game
  cols = 3
  rows = 3

  desktopMode = false
  sidebarWidth = 200
  
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
  onBoardSizeChange() {
    this.game.setBoardSize(this.cols, this.rows)
    this.updateSize()
  }

  updateSize() {
    const width = this.$el.clientWidth - 32
    this.desktopMode = width - this.sidebarWidth > 320
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
  }

  mounted() {
    this.game = new Game(<any>this.$refs["canvas"])
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
  margin-bottom: 8px;
}

.solve .time {
  font-weight: 500;
  flex-grow: 1;
}
</style>
