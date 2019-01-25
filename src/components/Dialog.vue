<template>
  <transition name="fade">
    <div v-if="open" class="dialog-container" :class="{ open: open }" @click.self="close">
      <div class="dialog" ref="dialog" tabindex="-1" @keydown.esc="close">
        <slot/>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from 'vue-property-decorator'

@Component({
  watch: {
    async open(open) {
      await this.$nextTick()
      const el = <HTMLElement>this.$refs["dialog"]
      if (open && el) el.focus()
    }
  }
})
export default class Dialog extends Vue {
  @Prop()
  open = false

  close() {
    this.$emit("update:open", false)
  }
}
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
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.dialog {
  padding: 24px;
  background: #f6f6f6;
  min-width: 240px;
  max-width: 400px;
  width: 100%;
  border-radius: 2px;
  outline: 0;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2);
  transition: transform 150ms ease-out;
}

.fade-enter .dialog, .fade-leave-to .dialog {
  transform: scale(0.75);
}
</style>
