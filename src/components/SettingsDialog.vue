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
h3 {
  margin: 0 0 16px;
}
</style>