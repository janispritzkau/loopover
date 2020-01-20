<template>
  <button
    @click="$emit('click', $event)"
    @mousedown="start"
    @touchstart="start"
    @touchend="stop"
    @mouseup="stop"
    @blur="stop"
  >
    <slot />
  </button>
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator"

@Component({})
export default class RepeatButton extends Vue {
  timeout = 0
  interval = 0

  start(event: Event) {
    this.stop()
    this.timeout = setTimeout(() => {
      this.interval = setInterval(() => {
        this.$emit("click", new Event("click"))
      }, 100)
    }, 500)
  }

  stop() {
    clearTimeout(this.timeout)
    clearInterval(this.interval)
  }
}
</script>
