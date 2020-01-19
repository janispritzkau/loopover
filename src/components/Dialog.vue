<template>
  <transition name="fade">
    <div v-if="open" class="dialog-container" :class="{ open: open }" @click.self="close">
      <div class="dialog" ref="dialog" tabindex="-1" @keydown.esc="close">
        <slot />
        <div class="actions">
          <button class="btn" @click="close">Close</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    open: Boolean
  },
  watch: {
    open(open) {
      if (!open) return
      setTimeout(() => {
        (this.$refs.dialog as HTMLDivElement).focus()
      })
    }
  },
  methods: {
    close() {
      this.$emit("update:open", false)
    }
  }
})
</script>


<style scoped>
.dialog-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.dialog {
  padding: 24px;
  background: var(--background);
  min-width: 240px;
  max-width: 440px;
  width: 100%;
  border-radius: 3px;
  outline: 0;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2);
  transition: transform 150ms ease-out;
}

.fade-enter .dialog,
.fade-leave-to .dialog {
  transform: scale(0.75);
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -8px;
}
</style>
