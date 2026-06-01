<template>
  <view 
    v-show="visible" 
    ref="toastRef" 
    class="toast-popup-container" 
    :class="[themeStore.themeClass, type]"
  >
    <view class="toast-content">
      <text class="toast-icon" v-if="icon">{{ icon }}</text>
      <view class="toast-text-group">
        <text class="toast-title" v-if="title">{{ title }}</text>
        <text class="toast-message">{{ message }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useThemeStore } from '../stores/theme'
import { gsap } from 'gsap'

const themeStore = useThemeStore()

const visible = ref(false)
const title = ref('')
const message = ref('')
const icon = ref('')
const type = ref<'info' | 'success' | 'warning'>('info')
const toastRef = ref(null)

let timer: any = null

const show = (options: { title?: string; message: string; icon?: string; type?: 'info' | 'success' | 'warning'; duration?: number }) => {
  if (timer) clearTimeout(timer)
  
  title.value = options.title || ''
  message.value = options.message
  icon.value = options.icon || ''
  type.value = options.type || 'info'
  visible.value = true

  nextTick(() => {
    if (!toastRef.value) return
    
    // GSAP scale back entries
    gsap.fromTo(toastRef.value, 
      { y: -60, opacity: 0, scale: 0.88 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.5)' }
    )
  })

  const duration = options.duration || 3200
  timer = setTimeout(() => {
    hide()
  }, duration)
}

const hide = () => {
  if (!toastRef.value) {
    visible.value = false
    return
  }
  
  gsap.to(toastRef.value, {
    y: -30,
    opacity: 0,
    scale: 0.94,
    duration: 0.3,
    onComplete: () => {
      visible.value = false
    }
  })
}

defineExpose({
  show,
  hide
})
</script>

<style lang="scss" scoped>
.toast-popup-container {
  position: fixed;
  top: 80rpx;
  left: 32rpx;
  right: 32rpx;
  z-index: 9999;
  border-radius: var(--radius-md, 16rpx);
  padding: 24rpx 32rpx;
  background-color: var(--bg-card);
  border: 1rpx solid var(--border);
  box-shadow: $shadow-lg;
  box-sizing: border-box;

  &.theme-stock {
    background-color: #161B22;
    border-color: #30363D;
    color: #E8E8E8;
    &.success { border-color: #00E676; }
    &.warning { border-color: #FF6B35; }
  }

  &.theme-lab {
    background-color: #FFFFFF;
    border-color: #DEE2E6;
    color: #2C3E50;
    &.success { border-color: #2ECC71; }
    &.warning { border-color: #E74C3C; }
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .toast-icon {
    font-size: 48rpx;
    line-height: 1;
  }

  .toast-text-group {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    flex: 1;
  }

  .toast-title {
    font-size: 28rpx;
    font-weight: bold;
  }

  .toast-message {
    font-size: 24rpx;
    opacity: 0.95;
  }
}
</style>
