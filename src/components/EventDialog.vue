<template>
  <Dialog title="Event" :open="open" @update:open="$emit('update:open', $event)">
    <button
      v-for="s in [3, 4, 5, 6, 7, 8, 9, 10, -1]"
      :key="s"
      @click="s > 0 ? $state.changeSize(s) : ($state.custom = true)"
      class="btn filled"
      :class="{ active: $state.rows == s && $state.cols == s || $state.custom && s == -1 }"
      style="margin: 0 8px 8px 0;"
    >{{ s > 0 ? `${s}×${s}` : "Custom" }}</button>

    <div v-if="$state.custom" style="display: flex; margin-bottom: 16px;">
      <div style="width: 50%; padding-right: 8px;">
        <label class="label">Columns</label>
        <input class="input" type="number" v-model.number.lazy="$state.cols" min="1" max="50" />
      </div>
      <div style="flex-grow: 1; padding-left: 8px;">
        <label class="label">Rows</label>
        <input class="input" type="number" v-model.number.lazy="$state.rows" min="1" max="50" />
      </div>
    </div>

    <label class="label">Event type</label>
    <select v-model="$state.event" class="input" style="margin-bottom: 16px;">
      <option :value="0">Normal</option>
      <option :value="1">Fewest moves challenge</option>
      <option :value="2">Blind</option>
    </select>

    <label class="checkbox" style="margin-bottom: 12px;">
      <input v-model="$state.noRegrips" type="checkbox" />
      <span>No regrips</span>
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
