import Vue from "vue"
import { registerSW } from "virtual:pwa-register"
import { state } from "./state"

import "normalize.css"
import "./main.css"
import App from "./App.vue"

Vue.config.productionTip = false

Vue.prototype.$state = state
window.state = state

new Vue({
  render: h => h(App),
}).$mount("#app")

if (import.meta.env.PROD) {
  let userHasInteracted = false

  addEventListener("click", () => {
    userHasInteracted = true
  })

  addEventListener("touchstart", event => {
    if (event.target == state.game.canvas) {
      userHasInteracted = true
    }
  }, { passive: true })

  const updateSW = registerSW({
    onRegisteredSW(_url, registration) {
      registration?.update()
    },
    onNeedRefresh() {
      // Activates the waiting service worker and reloads the page.
      if (userHasInteracted) {
        state.reloadPage = () => updateSW(true)
      } else {
        updateSW(true)
      }
    }
  })
}
