<template>
  <view ref="container" class="page-transition">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

const container = ref(null)
let ctx: gsap.Context | null = null

onMounted(() => {
  if (!container.value) return
  ctx = gsap.context(() => {
    const mm = gsap.matchMedia()
    
    // Support prefers-reduced-motion (accessibility)
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.from('.page-transition > *', {
        opacity: 0,
        duration: 0.25
      })
    })

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.page-transition > *', {
        opacity: 0,
        y: 30,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out'
      })
    })
  }, container.value)
})

onUnmounted(() => {
  if (ctx) ctx.revert()
})
</script>

<style lang="scss" scoped>
.page-transition {
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}
</style>
