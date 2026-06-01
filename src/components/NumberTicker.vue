<template>
  <text class="number-ticker">{{ formattedValue }}</text>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { gsap } from 'gsap'

const props = withDefaults(
  defineProps<{
    value: number
    duration?: number
    precision?: number
    prefix?: string
    suffix?: string
  }>(),
  {
    duration: 0.5,
    precision: 2,
    prefix: '',
    suffix: ''
  }
)

const displayValue = ref(props.value)
let ctx: gsap.Context | null = null

const formattedValue = computed(() => {
  return `${props.prefix}${displayValue.value.toFixed(props.precision)}${props.suffix}`
})

const updateTicker = (newValue: number) => {
  if (ctx) ctx.revert()
  ctx = gsap.context(() => {
    gsap.to(displayValue, {
      duration: props.duration,
      value: newValue,
      ease: 'power1.out'
    })
  })
}

watch(() => props.value, (newVal) => {
  updateTicker(newVal)
})

onMounted(() => {
  updateTicker(props.value)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<style scoped>
.number-ticker {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}
</style>
