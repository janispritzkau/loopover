<template>
    <div>
        <div v-for="(solve, i) in solves.slice(-max).reverse()" :key="i" class="solve" :class="{ fmc: fmc }">
            <div class="time">{{ formatTime(solve.time) + (solve.dnf && ' DNF' || '') }}</div>
            <div class="moves">{{ solve.moves.length || solve.moves }} moves</div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { Solve } from '../game'

@Component
export default class SolveItem extends Vue {
    @Prop({ required: true })
    solves!: Solve[]

    @Prop({ default: 12 })
    max!: number

    @Prop() fmc!: boolean

    formatTime(ms: number) {
        if (ms == null) return "-"
        const s = ms / 1000
        const min = (s / 60) | 0, sec = s % 60 | 0, mil = ms % 1000 | 0
        return `${min}:${sec.toString().padStart(2, "0")}.${mil.toString().padStart(3, "0")}`
    }
}
</script>

<style scoped>
.solve {
    display: flex;
    margin: 0 auto;
    padding: 6px 2px;
    margin-bottom: 0px;
    max-width: 240px;
}
.solve.fmc {
    flex-direction: row-reverse;
}

:not(.fmc) > .time, .fmc .moves {
    font-weight: 500;
    flex-grow: 1;
}

:not(.fmc) > .moves, .fmc .time {
    opacity: 0.8;
}
</style>
