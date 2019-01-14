<template>
  <div id="app">
    <canvas ref="canvas"/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { Game } from './game'

@Component
export default class App extends Vue {
  game!: Game
  
  mounted() {
    this.game = new Game(<any>this.$refs["canvas"])
    this.game.setWidth(480)
    this.game.setBoardSize(5)

    if (document.fonts) document.fonts.ready.then(() => this.game.render())
    else setTimeout(() => this.game.render(), 50)
  
    window.app = this, window.game = this.game
  }
}
</script>

<style>
#app {
  font-family: 'Roboto', sans-serif;
  color: rgba(0, 0, 0, 0.8);
}
</style>
