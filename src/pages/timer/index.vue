<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 头部说明 -->
      <view class="header-section">
        <text class="timer-status">{{ themeStore.t('timerStatus') }}</text>
        <text class="timer-rate">{{ rateText }}</text>
      </view>

      <!-- 环形进度条与计时器 -->
      <view class="circle-timer-section">
        <ProgressRing 
          :percentage="progressPercent" 
          :size="320" 
          :strokeWidth="10" 
          :color="ringColor" 
          :bgStroke="'var(--border)'"
        >
          <view class="timer-inner">
            <text class="time-display" :class="{ 'warning-text': isLongSit }">
              {{ formatTime(poopStore.elapsedSeconds) }}
            </text>
            <text class="timer-state-label">{{ timerStateLabel }}</text>
          </view>
        </ProgressRing>
      </view>

      <!-- 带薪收益展示 (扁平对账单式) -->
      <ThemeCard customClass="earnings-card">
        <text class="label">{{ themeStore.t('earningsRealtime') }}</text>
        <view class="earnings-row">
          <text class="currency">¥</text>
          <NumberTicker 
            class="value" 
            :value="poopStore.realtimeEarnings" 
            :precision="4" 
          />
        </view>
        <text class="speed-indicator">{{ speedText }}</text>
      </ThemeCard>

      <!-- 久蹲警告区 (扁平左边框横条) -->
      <view class="warning-banner-flat" v-if="isLongSit">
        <view class="warning-content">
          <text class="warning-title">{{ warningTitle }}</text>
          <text class="warning-desc">{{ warningDesc }}</text>
        </view>
      </view>

      <!-- 摸鱼电台 (BGM 辅助开关 - 极简扁平触控条) -->
      <view class="audio-controls-flat" @tap="toggleBgm">
        <view class="status-indicator" :class="{ 'is-active': bgmOn }"></view>
        <text class="btn-label">{{ audioLabel }}</text>
      </view>

      <!-- 底部操作区 -->
      <view class="action-buttons">
        <button class="finish-btn" @tap="handleFinish">
          {{ finishButtonText }}
        </button>
        <button class="abort-btn" @tap="handleAbort">
          {{ abortButtonText }}
        </button>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { useThemeStore } from '../../stores/theme'
import { calculateHourlyRate, calculatePerSecondRate } from '../../utils/salary-calculator'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import ProgressRing from '../../components/ProgressRing.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const poopStore = usePoopStore()
const themeStore = useThemeStore()

const bgmOn = ref(false)
const audioContext = ref<any>(null)

// 初始化白噪音音频
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

const progressPercent = computed(() => {
  const total = longSitThreshold.value * 60
  return Math.min((poopStore.elapsedSeconds / total) * 100, 100)
})

const ringColor = computed(() => {
  if (isLongSit.value) return 'var(--accent-warn)'
  return 'var(--accent)'
})

// 监听久蹲，产生振动提醒
let lastVibrateTime = 0
watch(() => poopStore.elapsedSeconds, (sec) => {
  if (isLongSit.value) {
    const now = Date.now()
    if (now - lastVibrateTime > 120000) { // 每 2 分钟提醒一次
      lastVibrateTime = now
      uni.vibrateLong({})
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

// 动态主题文字计算
const rateText = computed(() => {
  return themeStore.isStock
    ? `时薪: ¥${hourlyRate.value.toFixed(2)} | 报价/秒: ¥${secondRate.value.toFixed(4)}`
    : `代谢基准: ¥${hourlyRate.value.toFixed(2)} | 代谢率/秒: ¥${secondRate.value.toFixed(4)}`
})

const timerStateLabel = computed(() => {
  return themeStore.isStock ? '持仓中' : '反应时长'
})

const speedText = computed(() => {
  return themeStore.isStock
    ? `以秒速 ¥${secondRate.value.toFixed(4)} 持续增值`
    : `以代谢率 ¥${secondRate.value.toFixed(4)} 释放能量`
})

const warningTitle = computed(() => {
  return themeStore.isStock ? '平仓超时预警！' : '反应器过载警报！'
})

const warningDesc = computed(() => {
  return themeStore.isStock
    ? `持仓已超过 ${longSitThreshold.value} 分钟，为防爆仓及痔疮风险，建议平仓起立！`
    : `实验反应已持续 ${longSitThreshold.value} 分钟，为防仪器过载及生理疲劳，建议终止实验！`
})

const audioLabel = computed(() => {
  const title = bgmOn.value ? (themeStore.isStock ? '行情白噪音' : '白噪音反应流') : '已关闭'
  return `辅助电台: ${title}`
})

const finishButtonText = computed(() => {
  return themeStore.isStock ? '申请交割结算' : '导出实验报告'
})

const abortButtonText = computed(() => {
  return themeStore.isStock ? '撤回委单' : '废弃反应物'
})

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
      title: themeStore.isStock ? '开启白噪音' : '开启音频流',
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
      title: '电台已关闭',
      icon: 'none'
    })
  }
}

const handleFinish = () => {
  poopStore.stopPoop()
  uni.navigateTo({
    url: '/pages/result/index'
  })
}

const handleAbort = () => {
  uni.showModal({
    title: '放弃本次活动？',
    content: themeStore.isStock 
      ? '本次交易委托将全额撤回，不记录任何盈亏流水，确定放弃吗？'
      : '本次实验记录将直接废弃，不计入实验日志，确定放弃吗？',
    cancelText: '点错了',
    confirmText: '确定放弃',
    confirmColor: '#E74C3C',
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
  if (audioContext.value) {
    try {
      audioContext.value.destroy()
    } catch (e) {}
  }
  if (!poopStore.isPooping) {
    poopStore.cancelPoop()
  }
})
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 80rpx 40rpx;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 60rpx;
  text-align: center;

  .timer-status {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 4rpx;
    text-transform: uppercase;
  }

  .timer-rate {
    font-size: 20rpx;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
}

// 环形进度条区
.circle-timer-section {
  margin-bottom: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;

  .timer-inner {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .time-display {
      font-size: 72rpx;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--text-primary);
      letter-spacing: -2rpx;
    }
    
    .warning-text {
      color: var(--accent-warn) !important;
    }

    .timer-state-label {
      font-size: 20rpx;
      color: var(--text-secondary);
      margin-top: 10rpx;
      letter-spacing: 2rpx;
      text-transform: uppercase;
    }
  }
}

// 收益卡片
.earnings-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;

  .label {
    font-size: 20rpx;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .earnings-row {
    display: flex;
    align-items: baseline;
    margin: 16rpx 0;

    .currency {
      font-size: 36rpx;
      color: var(--accent);
      font-weight: 800;
      margin-right: 8rpx;
    }

    .value {
      font-size: 64rpx;
      font-weight: 800;
      color: var(--accent);
      font-family: var(--font-mono);
    }
  }

  .speed-indicator {
    font-size: 18rpx;
    color: var(--text-secondary);
  }
}

// 警告条
.warning-banner-flat {
  width: 100%;
  border-left: 4rpx solid var(--accent-warn);
  background-color: rgba(231, 76, 60, 0.05);
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  margin-bottom: 40rpx;
  box-sizing: border-box;

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .warning-title {
      font-size: 22rpx;
      font-weight: 800;
      color: var(--accent-warn);
      letter-spacing: 2rpx;
      text-transform: uppercase;
    }

    .warning-desc {
      font-size: 20rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
}

// BGM白噪音触控条
.audio-controls-flat {
  margin-bottom: 60rpx;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--border);
  border-top: 1rpx solid var(--border);
  cursor: pointer;

  &:active {
    opacity: 0.7;
  }

  .status-indicator {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background-color: transparent;
    border: 2rpx solid var(--text-secondary);
    transition: all 0.2s ease;

    &.is-active {
      background-color: var(--accent);
      border-color: var(--accent);
    }
  }

  .btn-label {
    font-size: 22rpx;
    color: var(--text-secondary);
    font-weight: 600;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

// 按钮区
.action-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .finish-btn {
    background-color: var(--accent);
    color: #ffffff;
    font-weight: bold;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: var(--radius-round);
    border: none;
    box-shadow: 0 8rpx 20rpx rgba(0, 230, 118, 0.15);

    &:active {
      transform: scale(0.98);
    }
  }

  .abort-btn {
    background-color: transparent;
    color: var(--text-secondary);
    font-size: 28rpx;
    height: 90rpx;
    line-height: 90rpx;
    border-radius: var(--radius-round);
    border: 2rpx solid var(--border);

    &:active {
      background-color: var(--border);
      color: var(--text-primary);
    }
  }
}
</style>
