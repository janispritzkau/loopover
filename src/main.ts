import Vue from "vue"
import { register } from "register-service-worker"
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

if (process.env.NODE_ENV === "production") {
  let userHasInteracted = false

  addEventListener("click", () => {
    userHasInteracted = true
  })

  addEventListener("touchstart", event => {
    if (event.target == state.game.canvas) {
      userHasInteracted = true
    }
  }, { passive: true })

  register(`${process.env.BASE_URL}service-worker.js`, {
    registered(registration: ServiceWorkerRegistration) {
      registration.update()
    },
    updated(registration: ServiceWorkerRegistration) {
      registration.waiting!.postMessage({ type: "SKIP_WAITING" })
      if (userHasInteracted) {
        state.reloadPage = () => location.reload()
      } else {
        location.reload()
      }
    }
  })
}
