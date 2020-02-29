<template>
  <div
    class="slider"
    tabindex="0"
    @mousedown="handleTouchStart"
    @touchstart="handleTouchStart"
    @keydown="handleKeyDown"
  >
    <div class="track" :style="{ width: (value_ - min) / (max - min) * 100 + '%' }" />
    <div class="thumb" :style="{ left: (value_ - min) / (max - min) * 100 + '%' }" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator"

@Component<Slider>({
  watch: {
    value_() {
      this.$emit("input", this.value_)
    },
    value() {
      this.setValue(this.value)
    }
  }
})
export default class Slider extends Vue {
  $el!: HTMLDivElement

  active = false

  @Prop({ type: Number, default: 0 }) value!: number
  @Prop({ type: Number, default: 0 }) min!: number
  @Prop({ type: Number, default: 1 }) max!: number
  @Prop({ type: Number, default: 0.1 }) step!: number

  private value_ = this.value

  setValue(value: number) {
    this.value_ = value
    if (this.step > 0) {
      this.value_ = Math.round((this.value_ - this.min) / this.step) * this.step + this.min
    }
    this.value_ = Math.min(Math.max(this.value_, this.min), this.max)
  }

  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowUp": this.setValue(this.max); break
      case "ArrowDown": this.setValue(this.min); break
      case "ArrowLeft": this.setValue(this.value_ - this.step); break
      case "ArrowRight": this.setValue(this.value_ + this.step); break
      default: return
    }
    event.preventDefault()
  }

  handleTouchStart(event: TouchEvent | MouseEvent) {
    if (event.cancelable) event.preventDefault()

    this.active = true
    this.$el.focus()
    const clientX = event.type == "touchstart" ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX
    this.setValue((clientX - this.$el.offsetLeft) / this.$el.offsetWidth * (this.max - this.min) + this.min)

    addEventListener("mousemove", this.handleTouchMove)
    addEventListener("mouseup", this.handleTouchEnd)
    addEventListener("touchmove", this.handleTouchMove)
    addEventListener("touchend", this.handleTouchEnd)
  }

  handleTouchMove(event: TouchEvent | MouseEvent) {
    const clientX = event.type == "touchmove" ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX
    this.setValue((clientX - this.$el.offsetLeft) / this.$el.offsetWidth * (this.max - this.min) + this.min)
  }

  handleTouchEnd() {
    this.active = false

    removeEventListener("mousemove", this.handleTouchMove)
    removeEventListener("mouseup", this.handleTouchEnd)
    removeEventListener("touchmove", this.handleTouchMove)
    removeEventListener("touchend", this.handleTouchEnd)
  }
}
</script>

<style scoped>
.slider {
  cursor: pointer;
  position: relative;
  padding: 6px 0;
  touch-action: none;
  user-select: none;
  outline: 0 !important;
}

.slider::after {
  content: "";
  display: flex;
  height: 2px;
  border-radius: 1px;
  background: var(--contrast-1);
}

.track {
  position: absolute;
  height: 2px;
  border-radius: 1px;
  background: var(--primary);
}

.thumb {
  cursor: pointer;
  position: absolute;
  top: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  background-clip: padding-box;
  transform: translateX(-6px);
}

.thumb::before {
  content: "";
  position: absolute;
  width: 40px;
  height: 40px;
  top: -13px;
  left: -13px;
  pointer-events: none;
  border-radius: 50%;
  opacity: 0.2;
}

.slider:focus .thumb::before {
  background: var(--primary);
}
</style>
