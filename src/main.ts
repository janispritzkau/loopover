import Vue from 'vue'
import { Game } from './game'
import './registerServiceWorker'
import 'normalize.css'
import 'typeface-roboto'
import './main.css'
import App from './App.vue'

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