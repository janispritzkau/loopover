<template>
  <div>
    <Main />
    <Footer />

    <div v-if="$state.reloadPage" class="update-notification dark">
      <span>A new version is available. Please reload to update.</span>
      <button class="btn secondary" @click="$state.reloadPage">Reload</button>
      <button class="btn" @click="$state.reloadPage = null">
        <svg width="20" viewBox="0 0 24 24">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
import Main from "./views/Main.vue"
import Footer from "./components/Footer.vue"

@Component({
  components: {
    Main,
    Footer
  }
})
export default class App extends Vue {
  reload() {
    location.reload()
  }
}
</script>