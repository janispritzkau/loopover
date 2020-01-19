import Vue from "vue"
import { register } from "register-service-worker"
import state from "./state"

import "normalize.css"
import "./main.css"
import App from "./App.vue"

Vue.config.productionTip = false

Vue.prototype.$state = state
window.state = state

new Vue({
  data: state,
  render: h => h(App),
}).$mount("#app")

if (process.env.NODE_ENV === "production") {
  register(`${process.env.BASE_URL}service-worker.js`, {
    updated(registration) {
      (window.app as any).refresh = () => {
        registration.waiting.postMessage({ type: "SKIP_WAITING" })
        location.reload()
      }
    }
  })
}
