<template>
  <div id="app">
    <div class="main-container">
      <div class="main-wrapper">
        <main>
          <canvas ref="canvas"/>
        </main>
        <aside v-if="desktopMode" :style="{ width: sidebarWidth + 'px' }">
          <button @click="scramble" class="sidebar-button" :disabled="isScrambled">Scramble</button>
        </aside>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Game } from './game'

@Component
export default class App extends Vue {
  game!: Game
  desktopMode = true
  cols = 5
  rows = 5
  sidebarWidth = 200
  isScrambled = false

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

  @Watch('desktopMode')
  updateSize() {
    const width = innerWidth - 32
    const height = innerHeight - (this.desktopMode ? 32 : 128)
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

  scramble() {
    this.game.scramble()
  }

  mounted() {
    this.game = new Game(<any>this.$refs["canvas"])
    
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
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
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
  background: rgba(0, 0, 0, 0.1);
}
.sidebar-button:active {
  background: rgba(0, 0, 0, 0.2);
}
</style>
