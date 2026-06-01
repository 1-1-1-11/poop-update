<template>
  <view 
    ref="badgeRef" 
    class="badge-icon-container" 
    :class="[themeStore.themeClass, rarity, { locked: !unlocked }]"
    @tap="$emit('click')"
  >
    <view class="badge-icon-inner">
      <text class="badge-emoji">{{ icon }}</text>
    </view>
    <view class="badge-glow" v-if="unlocked && rarity === 'legendary'"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { gsap } from 'gsap'

const props = withDefaults(
  defineProps<{
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    unlocked: boolean
  }>(),
  {
    rarity: 'common',
    unlocked: false
  }
)

defineEmits(['click'])

const themeStore = useThemeStore()
const badgeRef = ref(null)
let ctx: gsap.Context | null = null

onMounted(() => {
  if (props.unlocked && badgeRef.value) {
    ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.from(badgeRef.value, {
          opacity: 0,
          duration: 0.3
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(badgeRef.value, {
          scale: 0.7,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(1.8)',
          delay: Math.random() * 0.2
        })
      })
    }, badgeRef.value)
  }
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<style lang="scss" scoped>
.badge-icon-container {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--radius-sm, 4rpx);
  background: var(--bg-card);
  border: 1rpx solid var(--border);
  transition: all 0.3s ease;
  box-sizing: border-box;

  &.locked {
    filter: grayscale(1);
    opacity: 0.3;
    border-style: dashed;
    background-color: transparent !important;
  }

  // Rarity styling
  &.common { 
    border-color: var(--border); 
  }
  &.rare { 
    border-color: #3498DB; 
  }
  &.epic { 
    border-color: #9B59B6; 
  }
  &.legendary {
    border-color: #F1C40F;
    border-width: 2rpx;
    animation: gold-shine 3.5s infinite ease-in-out;
  }

  .badge-icon-inner {
    font-size: 56rpx;
    line-height: 1;
    z-index: 2;
  }

  .badge-glow {
    position: absolute;
    top: -8rpx;
    left: -8rpx;
    right: -8rpx;
    bottom: -8rpx;
    background: radial-gradient(circle, rgba(241, 196, 15, 0.15) 0%, rgba(241, 196, 15, 0) 75%);
    z-index: 1;
    pointer-events: none;
  }
}

@keyframes gold-shine {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1); }
}
</style>
