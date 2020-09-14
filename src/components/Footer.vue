<template>
  <footer>
    <p v-if="showShortcuts" class="shortcuts-link">
      <a @click="shortcutsDialog = true">Show keyboard shortcuts</a>
    </p>
    <p>
      Created by
      <a
        target="_blank"
        rel="noopener"
        href="https://github.com/janispritzkau"
      >Janis Pritzkau</a>.
    </p>
    <p>
      Remake of carykh's
      <a
        target="_blank"
        rel="noopener"
        href="https://openprocessing.org/sketch/580366"
      >Loopover</a>.
    </p>
    <p>
      <a target="_blank" rel="noopener" href="https://discord.gg/DXASrTp">Discord</a> |
      <a target="_blank" rel="noopener" href="https://github.com/janispritzkau/loopover">GitHub</a>
    </p>
    <div class="auth">
      <p v-if="$state.user">
        <img v-if="$state.user.avatarUrl" :src="$state.user.avatarUrl" />
        Signed in as {{ $state.user.name }}
      </p>
      <template v-if="$state.user">
        <a @click="signOut">Sign out</a>
      </template>
      <template v-else>
        <p>Log in to synchronize your solves.</p>
        <a @click="signIn('google')">Sign in with Google</a>
        <a @click="signIn('discord')">Sign in with Discord</a>
      </template>
    </div>

    <ShortcutsDialog :open.sync="shortcutsDialog" />
  </footer>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"
import ShortcutsDialog from "./ShortcutsDialog.vue"
import * as auth from "../auth"

@Component({
  components: {
    ShortcutsDialog
  }
})
export default class Footer extends Vue {
  shortcutsDialog = false

  get showShortcuts() {
    return !("ontouchstart" in window)
  }

  async signIn(provider: "google" | "discord") {
    switch (provider) {
      case "google": auth.signInWithGoogle(); break
      case "discord": auth.signInWithDiscord(); break
    }
  }

  async signOut() {
    auth.signOut()
  }
}
</script>

<style scoped>
footer {
  max-width: 480px;
  margin: 32px auto;
  padding: 0 16px;
  box-sizing: content-box;
}

p,
.auth {
  text-align: center;
}

.auth {
  margin: 28px auto 16px;
  font-size: 14px;
}

.auth a {
  margin: 0 6px;
}

.auth img {
  height: 32px;
  border-radius: 50%;
  vertical-align: middle;
  margin: -8px 8px -6px 0;
  user-select: none;
}
</style>
