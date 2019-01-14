import Vue from 'vue'
import App from './App.vue'
import { Game } from './game'
import './registerServiceWorker'
import 'typeface-roboto'
import 'normalize.css'

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')

declare global {
  interface Window {
    app: App
    game: Game
  }
  interface Document {
    fonts?: { ready: Promise<any> }
  }
}