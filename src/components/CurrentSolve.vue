<template>
    <div class="current-solve" :class="{ fmc: fmc }">
        <div class="current-time">{{ formatTime(time) + (dnf && ' DNF' || '') }}</div>
        <div class="current-moves">{{ moves }} moves</div>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class CurrentSolve extends Vue {
    @Prop() time!: number
    @Prop() moves!: number
    @Prop() fmc!: boolean
    @Prop() dnf!: boolean
   
    formatTime(ms: number) {
        if (ms == null) return "-"
        const s = ms / 1000
        const min = (s / 60) | 0, sec = s % 60 | 0, mil = ms % 1000 | 0
        return `${min}:${sec.toString().padStart(2, "0")}.${mil.toString().padStart(3, "0")}`
    }
}
</script>

<style scoped>
.current-solve {
    display: flex;
    flex-direction: column;
}
.current-solve.fmc {
    flex-direction: column-reverse;
}

:not(.fmc) > .current-time, .fmc .current-moves {
  font-size: 24px;
  line-height: 1;
  font-weight: 500;
  margin-bottom: 2px;
}

:not(.fmc) > .current-moves, .fmc .current-time {
  opacity: 0.8;
}
</style>
