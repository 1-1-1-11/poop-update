<template>
  <view class="progress-ring-container" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <svg class="progress-ring" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle
        class="progress-ring-bg"
        :stroke="bgStroke"
        :stroke-width="strokeWidthPx"
        fill="transparent"
        r="44"
        cx="50"
        cy="50"
      />
      <circle
        class="progress-ring-bar"
        :stroke="color"
        :stroke-width="strokeWidthPx"
        fill="transparent"
        r="44"
        cx="50"
        cy="50"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashoffset"
        stroke-linecap="round"
        transform="rotate(-90 50 50)"
      />
    </svg>
    <view class="progress-ring-content">
      <slot></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    percentage: number
    size?: number // size in rpx
    strokeWidth?: number // stroke width in rpx
    color?: string
    bgStroke?: string
  }>(),
  {
    size: 200,
    strokeWidth: 8,
    color: 'var(--accent)',
    bgStroke: 'var(--border)'
  }
)

const strokeWidthPx = computed(() => props.strokeWidth * (100 / props.size))
const circumference = 2 * Math.PI * 44 // r = 44
const dashoffset = computed(() => {
  const percent = Math.min(Math.max(props.percentage, 0), 100)
  return circumference - (percent / 100) * circumference
})
</script>

<style lang="scss" scoped>
.progress-ring-container {
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.progress-ring {
  width: 100%;
  height: 100%;
}

.progress-ring-bg {
  transition: stroke 0.3s ease;
}

.progress-ring-bar {
  transition: stroke-dashoffset 0.35s ease, stroke 0.3s ease;
}

.progress-ring-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>
