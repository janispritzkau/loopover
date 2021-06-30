<template>
  <Dialog title="Shortcuts" :open="open" @update:open="$emit('update:open', $event)">
    <ul>
      <li>
        <code>Space</code> move tile when pressing arrow key
      </li>
      <li>
        <code>Ctrl or<br>Shift</code> move twice when pressing arrow key
      </li>
      <li>
        <code>↑, w, k</code> move up
      </li>
      <li>
        <code>←, a, h</code> move left
      </li>
      <li>
        <code>↓, s, j</code> move down
      </li>
      <li>
        <code>→, d, l</code> move right
      </li>
      <li>
        <code>u</code> undo
      </li>
      <li>
        <code>r</code> redo
      </li>
      <li>
        <code>Enter</code> scramble / done in blind mode
      </li>
    </ul>

    <p>You can type a number before the arrow key to specify how much to move in a direction.</p>
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
ul {
  padding: 0;
  margin: 20px 0 16px;
  list-style: none;
}

li {
  display: flex;
  margin: 8px 0;
}

code {
  font-family: "Roboto Mono", monospace;
  white-space: pre;
  display: inline-block;
  font-weight: 700;
  flex-shrink: 0;
  width: 90px;
}
</style>
