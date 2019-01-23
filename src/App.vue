<template>
  <div id="app">
    <div class="main-container" :style="{ height: height + 'px' }">
      <div class="main-wrapper" :style="{ margin: margin + 'px' }">
        <main>
          <div v-if="!desktopMode" style="height: 0; display: flex; align-items: flex-end; transform: translateY(-6px);" :style="{ marginTop: '48px' }">
            <CurrentSolve :dnf="dnf" :time="time" :moves="moveHistory.length - undoCount" :fmc="eventType == 1" style="flex-grow: 1;" />
            <button @click="inSolvingPhase ? done() : scramble()" :disabled="isScrambled && !inSolvingPhase">
              {{ eventType == 2 && gameStarted ? "Done" : "Scramble" }}
            </button>
          </div>
          <canvas ref="canvas"/>
          <div style="display: flex; height: 0px; transform: translateY(6px);" :style="{ marginBottom: '36px' }">
            <button @click="eventDialog = true">Event: {{cols}}×{{rows}} {{ getEventName(eventType) }}</button>
            <div style="flex-grow: 1;"/>
            <button @click="optionsDialog = true">Options</button>
          </div>
        </main>
        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button @click="inSolvingPhase ? done() : scramble()" :disabled="isScrambled && !inSolvingPhase" class="sidebar-button">
            {{ eventType == 2 && gameStarted ? "Done" : "Scramble" }}
          </button>
          <div v-if="eventType == 1" style="margin-bottom: 16px; display: flex;">
            <button @click="undo" style="flex-grow: 1;" :disabled="this.undoCount >= this.moveHistory.length">Undo</button>
            <button @click="redo" style="flex-grow: 1;" :disabled="this.undoCount == 0">Redo</button>
          </div>
          <CurrentSolve :dnf="dnf" :time="time" :moves="moveHistory.length - undoCount" :fmc="eventType == 1" style="margin-bottom: 8px;" />
          <SolveList :solves="solves" :max="sidebarSolvesNum" :fmc="eventType == 1"/>
        </aside>
      </div>
    </div>
    <section v-if="!desktopMode || sidebarSolvesNum < 5">
      <SolveList v-if="solves.length > 0" :solves="solves" :fmc="eventType == 1"/>
      <div v-else style="opacity: 0.8;">No solves yet</div>
    </section>
    <Dialog :open.sync="eventDialog">
      <h3>Event</h3>
      <div style="display: flex; margin-bottom: 16px;">
        <div style="width: 50%; padding-right: 8px;">
          <label>Cols</label>
          <input class="input" type="number" v-model.number.lazy="cols" :min="2" :max="50">
        </div>
        <div style="flex-grow: 1; padding-left: 8px;">
          <label>Rows</label>
          <input class="input" type="number" v-model.number.lazy="rows" :min="2" :max="50">
        </div>
      </div>
      <label>Event type</label>
      <select v-model.number="eventType">
        <option :value="0">Normal</option>
        <option :value="1">FMC</option>
        <option :value="2">Blind</option>
      </select>
    </Dialog>
    <Dialog :open.sync="optionsDialog">
      <h3>Options</h3>
      <label>
        <input type="checkbox" v-model="forceMobile">
        Force mobile mode
      </label>
      <label>
        <input type="checkbox" v-model="useLetters">
        Use letters
      </label>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Game, Move, Solve, Board } from './game'
import Dialog from "./components/Dialog.vue"
import SolveList from "./components/SolveList.vue"
import CurrentSolve from "./components/CurrentSolve.vue"

enum EventType {
  Normal = 0,
  Fmc = 1,
  Blind = 2
}

@Component({ components: { Dialog, SolveList, CurrentSolve } })
export default class App extends Vue {
  game!: Game
  cols = 3
  rows = 3
  eventType = EventType.Normal

  desktopMode = false
  forceMobile = false
  useLetters = true
  height = 0
  margin = 16
  sidebarWidth = 192
  sidebarSolvesNum = 12

  eventDialog = false
  optionsDialog = false
  
  gameStarted = false
  isScrambled = false
  startTime = 0
  time = 0
  memoTime = 0
  dnf = false
  inSolvingPhase = false
  interval!: number

  solves: Solve[] = []
  scrambledBoard?: Board
  moveHistory: Move[] = []
  undoCount = 0

  undo() {
    if (this.undoCount >= this.moveHistory.length) return
    const index = this.moveHistory.length - this.undoCount - 1
    const move = this.moveHistory[index]
    this.game.animatedMove(move.axis, move.index, -move.n)
    this.undoCount += 1
  }

  redo() {
    if (this.undoCount == 0) return
    const move = this.moveHistory[this.moveHistory.length - this.undoCount]
    this.game.animatedMove(move.axis, move.index, move.n)
    this.undoCount -= 1
  }

  getEventName(type: EventType) {
    switch (type) {
      case EventType.Normal: return ""
      case EventType.Fmc: return "FMC"
      case EventType.Blind: return "Blind"
    }
  }

  formatTime(ms: number) {
    if (ms == null) return "-"
    const s = ms / 1000
    const min = (s / 60) | 0, sec = s % 60 | 0, mil = ms % 1000 | 0
    return `${min}:${sec.toString().padStart(2, "0")}:${mil.toString().padStart(3, "0")}`
  }

  reset() {
    clearInterval(this.interval)
    this.moveHistory = []
    this.undoCount = 0
    this.solves = []
    this.dnf = false
    this.isScrambled = this.gameStarted = false
    this.time = this.memoTime = 0
  }

  scramble() {
    this.game.scramble()
    this.isScrambled = true
    this.scrambledBoard = this.game.board.clone()
    this.moveHistory = []
    this.dnf = false
    this.undoCount = 0
    if (this.eventType == EventType.Blind) this.startGame()
  }

  startGame() {
    this.gameStarted = true
    this.time = this.memoTime = 0
    this.inSolvingPhase = false
    this.startTime = Date.now()
    this.interval = setInterval(() => {
      this.time = Date.now() - this.startTime
    }, 87)
  }

  onMove(move: Move) {
    if (this.isScrambled && !this.gameStarted) this.startGame()
    if (!this.gameStarted) return
    if (this.undoCount > 0) {
      this.moveHistory.splice(this.moveHistory.length - this.undoCount, this.undoCount)
      this.undoCount = 0
    }
    this.moveHistory.push(move)
    if (this.eventType == EventType.Blind) {
      this.game.blind = true
      this.game.render()
      this.inSolvingPhase = true
      this.memoTime = Date.now() - this.startTime  
    } else if (this.game.board.isSolved()) {
      this.onSolved()
    }
  }

  done() {
    this.game.blind = false
    this.game.render()
    this.dnf = !this.game.board.isSolved()
    this.onSolved()
  }

  onSolved() {
    clearInterval(this.interval)
    this.time = Date.now() - this.startTime
    this.isScrambled = false
    this.gameStarted = false
    this.inSolvingPhase = false
    this.game.pointers.clear()
    this.solves.push({
      time: this.time,
      memoTime: this.memoTime,
      moves: this.moveHistory,
      scramble: this.scrambledBoard!,
      dnf: this.dnf
    })
  }

  @Watch('cols')
  @Watch('rows')
  @Watch('eventType')
  onBoardSizeChange() {
    this.cols = Math.min(Math.max(this.cols, 2), 50)
    this.rows = Math.min(Math.max(this.rows, 2), 50)
    this.game.setBoardSize(this.cols, this.rows)
    this.updateSize()
    this.reset()
  }

  @Watch('forceMobile')
  @Watch('margin')
  updateSize() {
    const { clientWidth: w, clientHeight: h } = document.documentElement;
    this.height = h
    const { cols, rows } = this.game

    const width = w - this.margin * 2
    const desktopHeight = h - (this.margin * 2 + 36)
    const mobileHeight = h - (this.margin * 2 + 36 + 48)
    const desktopWidth = width - this.sidebarWidth

    if (this.forceMobile) {
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
      const maxWidth = this.cols * 56 + 256 * (aspectRatio > 1 ? aspectRatio : 1)
      this.game.setWidth(Math.min(canvasWidth, maxWidth))
    } else {
      const maxHeight = this.rows * 56 + 256 / (aspectRatio < 1 ? aspectRatio : 1)
      this.game.setHeight(Math.min(height, maxHeight))
    }
    this.sidebarSolvesNum = ((this.game.height / this.game.dpr - 96) / 40) | 0
  }

  @Watch('useLetters') onUseLettersChanged() {
    this.game.useLetters = this.useLetters
    this.game.render()
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
}

.main-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f4;
  box-sizing: content-box;
  padding-bottom: 16px;
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
