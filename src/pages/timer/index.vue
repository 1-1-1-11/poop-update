<template>
  <view class="timer-container">
    <!-- 头部说明 -->
    <view class="header-section">
      <text class="timer-status">努力排泄中...</text>
      <text class="timer-rate">时薪: ¥{{ hourlyRate.toFixed(2) }} | 秒薪: ¥{{ secondRate.toFixed(4) }}</text>
    </view>

    <!-- 呼吸圆环与计时器 -->
    <view class="circle-timer-section">
      <view class="pulsing-orb" :class="{ 'warning-orb': isLongSit }">
        <view class="orb-wave wave-1"></view>
        <view class="orb-wave wave-2"></view>
        <view class="orb-center">
          <text class="time-display">{{ formatTime(poopStore.elapsedSeconds) }}</text>
          <text class="realtime-text">已坚持</text>
        </view>
      </view>
    </view>

    <!-- 带薪收益展示 -->
    <view class="earnings-card">
      <text class="label">当前带薪收入</text>
      <view class="earnings-row">
        <text class="currency">¥</text>
        <text class="value">{{ poopStore.realtimeEarnings.toFixed(2) }}</text>
      </view>
      <text class="speed-indicator">以秒速 ¥{{ secondRate.toFixed(4) }} 持续增长中</text>
    </view>

    <!-- 久蹲警告区 -->
    <view class="warning-banner" v-if="isLongSit">
      <text class="warning-icon">⚠️</text>
      <view class="warning-content">
        <text class="warning-title">久蹲预警！</text>
        <text class="warning-desc">已蹲厕超过 {{ longSitThreshold }} 分钟，为防脱肛或痔疮，建议起立！</text>
      </view>
    </view>

    <!-- 摸鱼电台 (BGM 辅助开关) -->
    <view class="audio-controls">
      <view class="control-btn" @tap="toggleBgm">
        <text class="icon">{{ bgmOn ? '🎵' : '🔇' }}</text>
        <text class="label">摸鱼白噪音: {{ bgmOn ? '大自然水流声' : '静音' }}</text>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="action-buttons">
      <button class="finish-btn" @tap="handleFinish">
        拉完了，去结算
      </button>
      <button class="abort-btn" @tap="handleAbort">
        中途放弃
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { calculateHourlyRate, calculatePerSecondRate } from '../../utils/salary-calculator'

const userStore = useUserStore()
const poopStore = usePoopStore()

const bgmOn = ref(false)
const audioContext = ref<any>(null)

// 初始化白噪音音频 (使用 uni-app 内置音频 API)
const initAudio = () => {
  if (audioContext.value) return
  try {
    audioContext.value = uni.createInnerAudioContext()
    audioContext.value.src = '/static/audio/white-noise.mp3'
    audioContext.value.loop = true
    audioContext.value.autoplay = false
  } catch (e) {
    console.warn('音频初始化失败:', e)
  }
}

// 基础薪资率
const hourlyRate = computed(() => {
  if (!userStore.user) return 0
  return calculateHourlyRate(
    userStore.user.monthly_salary,
    userStore.user.work_days_per_month,
    userStore.user.work_hours_per_day
  )
})

const secondRate = computed(() => {
  if (!userStore.user) return 0
  return calculatePerSecondRate(
    userStore.user.monthly_salary,
    userStore.user.work_days_per_month,
    userStore.user.work_hours_per_day
  )
})

// 久蹲提醒设置阈值 (分钟)
const longSitThreshold = computed(() => {
  return userStore.user?.settings?.long_sit_minutes || 20
})

// 是否属于久蹲
const isLongSit = computed(() => {
  return poopStore.elapsedSeconds >= longSitThreshold.value * 60
})

// 监听久蹲，产生振动提醒
let lastVibrateTime = 0
watch(() => poopStore.elapsedSeconds, (sec) => {
  if (isLongSit.value) {
    const now = Date.now()
    // 每 2 分钟振动提醒一次
    if (now - lastVibrateTime > 120000) {
      lastVibrateTime = now
      uni.vibrateLong({
        success: () => {
          console.log('久蹲长振动提醒成功')
        }
      })
    }
  }
})

// 格式化时间为 MM:SS 或 HH:MM:SS
const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  
  const pad = (num: number) => String(num).padStart(2, '0')
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

const toggleBgm = () => {
  bgmOn.value = !bgmOn.value
  if (bgmOn.value) {
    initAudio()
    if (audioContext.value) {
      try {
        if (typeof audioContext.value.play === 'function') {
          audioContext.value.play()
        }
      } catch (e) {
        console.warn('音频播放失败:', e)
      }
    }
    uni.showToast({
      title: '播放白噪音 潺潺流水声 🌊',
      icon: 'none'
    })
  } else {
    if (audioContext.value) {
      try {
        if (typeof audioContext.value.stop === 'function') {
          audioContext.value.stop()
        }
      } catch (e) {
        console.warn('音频停止失败:', e)
      }
    }
    uni.showToast({
      title: '摸鱼电台已静音',
      icon: 'none'
    })
  }
}

const handleFinish = () => {
  // 停止计时并跳转结算
  poopStore.stopPoop()
  uni.navigateTo({
    url: '/pages/result/index'
  })
}

const handleAbort = () => {
  uni.showModal({
    title: '提示',
    content: '本次计时将作废，不保存拉屎数据，确定放弃吗？',
    cancelText: '手滑了',
    confirmText: '确定放弃',
    confirmColor: '#FF6B6B',
    success: (res) => {
      if (res.confirm) {
        poopStore.cancelPoop()
        uni.switchTab({
          url: '/pages/index/index'
        })
      }
    }
  })
}

onUnmounted(() => {
  // 确保退出页面时，如果不为计时状态，重置一下
  if (!poopStore.isPooping) {
    poopStore.cancelPoop()
  }
})
</script>

<style lang="scss" scoped>
.timer-container {
  min-height: 100vh;
  background-color: #121212; // 沉浸式暗黑背景
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 80rpx 40rpx;
  box-sizing: border-box;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 60rpx;
  text-align: center;

  .timer-status {
    font-size: 34rpx;
    font-weight: bold;
    color: $color-primary;
    letter-spacing: 2rpx;
  }

  .timer-rate {
    font-size: 22rpx;
    color: #888888;
  }
}

// 呼吸圆环
.circle-timer-section {
  margin-bottom: 60rpx;

  .pulsing-orb {
    position: relative;
    width: 320rpx;
    height: 320rpx;
    display: flex;
    justify-content: center;
    align-items: center;

    .orb-center {
      width: 250rpx;
      height: 250rpx;
      border-radius: 999rpx;
      background-color: #1f1f1f;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 5;
      border: 2rpx solid #333333;

      .time-display {
        font-size: 64rpx;
        font-weight: bold;
        font-family: 'Courier New', Courier, monospace;
        color: #ffffff;
      }

      .realtime-text {
        font-size: 22rpx;
        color: #888888;
        margin-top: 10rpx;
      }
    }

    .orb-wave {
      position: absolute;
      width: 250rpx;
      height: 250rpx;
      border-radius: 999rpx;
      border: 4rpx solid rgba(255, 140, 66, 0.4);
      opacity: 0;
      z-index: 1;
      animation: breathe 3s infinite ease-in-out;
    }

    .wave-2 {
      animation-delay: 1.5s;
    }
  }

  // 警告样式下圆环变红
  .warning-orb {
    .orb-wave {
      border-color: rgba(244, 67, 54, 0.5);
      animation: alert-breathe 2s infinite ease-in-out;
    }
    .orb-center .time-display {
      color: #f44336;
    }
  }
}

// 收益卡片
.earnings-card {
  width: 100%;
  background-color: #1a1a1a;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1rpx solid #2d2d2d;
  margin-bottom: 40rpx;

  .label {
    font-size: 24rpx;
    color: #aaaaaa;
    letter-spacing: 2rpx;
  }

  .earnings-row {
    display: flex;
    align-items: baseline;
    margin: 16rpx 0;

    .currency {
      font-size: 40rpx;
      color: $color-primary;
      font-weight: bold;
      margin-right: 8rpx;
    }

    .value {
      font-size: 72rpx;
      font-weight: bold;
      color: $color-primary;
      font-family: 'Courier New', Courier, monospace;
    }
  }

  .speed-indicator {
    font-size: 20rpx;
    color: #666666;
  }
}

// 警告条
.warning-banner {
  width: 100%;
  background-color: rgba(244, 67, 54, 0.1);
  border: 1rpx solid rgba(244, 67, 54, 0.3);
  border-radius: $radius-md;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
  box-sizing: border-box;

  .warning-icon {
    font-size: 48rpx;
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .warning-title {
      font-size: 26rpx;
      font-weight: bold;
      color: #f44336;
    }

    .warning-desc {
      font-size: 22rpx;
      color: #e57373;
    }
  }
}

// BGM白噪音
.audio-controls {
  margin-bottom: 60rpx;
  width: 100%;

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1e1e1e;
    border-radius: $radius-round;
    padding: 20rpx 40rpx;
    gap: 16rpx;
    border: 1rpx solid #333333;
    transition: all 0.2s ease;

    &:active {
      background-color: #2b2b2b;
    }

    .icon {
      font-size: 32rpx;
    }

    .label {
      font-size: 24rpx;
      color: #cccccc;
    }
  }
}

// 按钮区
.action-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28rpx;

  .finish-btn {
    background: linear-gradient(90deg, #4CAF50 0%, #388E3C 100%);
    color: #ffffff;
    font-size: 32rpx;
    font-weight: bold;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: $radius-round;
    border: none;
    box-shadow: 0 8rpx 20rpx rgba(76, 175, 80, 0.3);

    &:active {
      transform: scale(0.98);
      box-shadow: 0 4rpx 10rpx rgba(76, 175, 80, 0.1);
    }
  }

  .abort-btn {
    background-color: transparent;
    color: #aaaaaa;
    font-size: 28rpx;
    height: 90rpx;
    line-height: 90rpx;
    border-radius: $radius-round;
    border: 2rpx solid #444444;

    &:active {
      background-color: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
  }
}

@keyframes breathe {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

@keyframes alert-breathe {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}
</style>
