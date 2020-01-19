<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <h3>Settings</h3>
    <label class="checkbox">
      <input v-model="$state.darkMode" type="checkbox" />
      <span>Dark mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.forceMobile" type="checkbox" />
      <span>Force mobile mode</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.useLetters" type="checkbox" />
      <span>Use letters</span>
    </label>
    <label class="checkbox">
      <input v-model="$state.darkText" type="checkbox" />
      <span>Dark text</span>
    </label>
    <button class="btn export" @click="$state.export()">Export solves</button>
  </Dialog>
</template>

<script lang="ts">
import Vue from "vue"
import Dialog from "./Dialog.vue"

export default Vue.extend({
  components: {
    Dialog
  },
  props: {
    open: Boolean
  }
})
</script>

<style scoped>
.export {
  margin: 16px 0 0;
}
</style>