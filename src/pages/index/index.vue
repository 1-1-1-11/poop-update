<template>
  <view class="home-container" v-if="userStore.user">
    <!-- 头部个人资料及职级 -->
    <view class="profile-header-card">
      <view class="user-info">
        <image class="avatar" :src="userStore.user.avatar_url || '/static/images/tab-profile-active.png'" mode="aspectFill" />
        <view class="name-rank">
          <text class="nickname">{{ userStore.user.nickname }}</text>
          <view class="rank-badge">
            <text class="rank-name">🏆 {{ userStore.user.current_title }}</text>
            <text class="level-tag">Lv.{{ userStore.user.current_level }}</text>
          </view>
        </view>
      </view>

      <!-- XP 进度条 -->
      <view class="xp-section" v-if="nextTitle">
        <view class="xp-labels">
          <text class="xp-text">经验值 (XP): {{ userStore.user.total_xp }} / {{ nextTitle.minXP }}</text>
          <text class="xp-percent">{{ xpPercent }}%</text>
        </view>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: xpPercent + '%' }"></view>
        </view>
        <text class="next-rank-hint">距离晋升【{{ nextTitle.title }}】还需 {{ nextTitle.minXP - userStore.user.total_xp }} XP</text>
      </view>
      <view class="xp-section" v-else>
        <text class="xp-text">恭喜达到满级！ 经验值: {{ userStore.user.total_xp }}</text>
      </view>
    </view>

    <!-- 今日摸鱼看板 -->
    <view class="stats-panel">
      <view class="panel-header">今日摸鱼战报</view>
      <view class="grid-stats">
        <view class="stat-card main-stat">
          <text class="stat-val salary-text">¥{{ todayEarnings.toFixed(2) }}</text>
          <text class="stat-label">今日带薪收益</text>
        </view>
        <view class="right-stats">
          <view class="stat-card">
            <text class="stat-val">{{ todayCount }}次</text>
            <text class="stat-label">今日如厕</text>
          </view>
          <view class="stat-card">
            <text class="stat-val">{{ formatDuration(todayDuration) }}</text>
            <text class="stat-label">今日时长</text>
          </view>
        </view>
      </view>
      <!-- 打卡天数 -->
      <view class="streak-banner">
        <text class="streak-icon">🔥</text>
        <text class="streak-text">您已连续带薪打卡 <text class="highlight">{{ userStore.user.streak_days || 0 }}</text> 天，肠胃棒棒哒！</text>
      </view>
    </view>

    <!-- 核心开始按钮 -->
    <view class="action-section">
      <view class="pulsing-button-container" @tap="handleStartPoop">
        <view class="pulse-wave wave-1"></view>
        <view class="pulse-wave wave-2"></view>
        <view class="poop-btn">
          <text class="poop-icon">💩</text>
          <text class="poop-btn-text">开始拉屎</text>
        </view>
      </view>
      <text class="btn-subtext">点击进入专注带薪计算模式</text>
    </view>

    <!-- 功能导航网格 -->
    <view class="nav-grid">
      <view class="nav-item" @tap="navigateTo('/pages/fortune/index')">
        <text class="nav-icon">🔮</text>
        <text class="nav-name">今日屎运</text>
      </view>
      <view class="nav-item" @tap="navigateTo('/pages/weekly-report/index')">
        <text class="nav-icon">📊</text>
        <text class="nav-name">摸鱼周报</text>
      </view>
      <view class="nav-item" @tap="navigateTo('/pages/rank/index')">
        <text class="nav-icon">🎖️</text>
        <text class="nav-name">我的职级</text>
      </view>
      <view class="nav-item" @tap="navigateTo('/pages/badges/index')">
        <text class="nav-icon">🏅</text>
        <text class="nav-name">成就勋章</text>
      </view>
      <view class="nav-item full-width" @tap="navigateTo('/pages/social/index')">
        <text class="nav-icon">🤝</text>
        <text class="nav-name">拉屎战队（与同事PK）</text>
        <text class="nav-arrow">❯</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { getNextTitle } from '../../utils/salary-calculator'
import { apiCall } from '../../services/api'
import type { StatsData } from '../../utils/types'

const userStore = useUserStore()
const poopStore = usePoopStore()

const todayEarnings = ref<number>(0)
const todayCount = ref<number>(0)
const todayDuration = ref<number>(0)

onShow(async () => {
  // 1. 加载用户资料，若未登录重定向
  const loggedIn = await userStore.loadProfile()
  if (!loggedIn) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }

  // 2. 加载今日拉屎统计数据
  await fetchTodayStats()

  // 3. 检查是否有未保存的计时器需要恢复
  poopStore.restoreSession(
    userStore.user!.monthly_salary,
    userStore.user!.work_days_per_month,
    userStore.user!.work_hours_per_day
  )

  // 如果计时器仍在运行，重定向至计时页面
  if (poopStore.isPooping) {
    uni.navigateTo({
      url: '/pages/timer/index'
    })
  }
})

// 获取今日统计数
const fetchTodayStats = async () => {
  try {
    const res = await apiCall<StatsData>('session-manager', 'stats', { period: 'week' })
    if (res.code === 0 && res.data?.daily_distribution) {
      const todayStr = getLocalDateString(Date.now())
      const todayData = res.data.daily_distribution.find((d: any) => d.date === todayStr)
      if (todayData) {
        todayEarnings.value = todayData.earnings
        todayCount.value = todayData.sessions // schema 中 sessions 代表拉屎频次
        todayDuration.value = todayData.duration
      } else {
        todayEarnings.value = 0
        todayCount.value = 0
        todayDuration.value = 0
      }
    }
  } catch (e) {
    console.error(e)
  }
}

// 格式化 YYYY-MM-DD
function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 下个职级定义
const nextTitle = computed(() => {
  if (!userStore.user) return null
  return getNextTitle(userStore.user.current_level)
})

// XP 进度条百分比
const xpPercent = computed(() => {
  if (!userStore.user || !nextTitle.value) return 100
  // 获取当前职级最少XP
  const currentTitleMin = userStore.user.total_xp - (userStore.user.total_xp % 100) // 粗略估算或直接范围
  const range = nextTitle.value.minXP - currentTitleMin
  const progressed = userStore.user.total_xp - currentTitleMin
  const pct = Math.round((progressed / range) * 100)
  return Math.min(Math.max(pct, 0), 100)
})

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  if (m === 0) return `${seconds}秒`
  return `${m}分钟`
}

const navigateTo = (path: string) => {
  uni.navigateTo({ url: path })
}

const handleStartPoop = () => {
  if (!userStore.user) return
  
  // 震动回馈
  uni.vibrateShort({})
  
  poopStore.startPoop(
    userStore.user.monthly_salary,
    userStore.user.work_days_per_month,
    userStore.user.work_hours_per_day
  )
  uni.navigateTo({
    url: '/pages/timer/index'
  })
}
</script>

<style lang="scss" scoped>
.home-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 头部卡片
.profile-header-card {
  background: linear-gradient(135deg, #ffffff 0%, #fffbf8 100%);
  border-radius: $radius-lg;
  padding: 36rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;

  .user-info {
    display: flex;
    align-items: center;
    gap: 24rpx;

    .avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: $radius-round;
      background-color: #ffdcb0;
      border: 4rpx solid #ffd8c0;
    }

    .name-rank {
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .nickname {
        font-size: 34rpx;
        font-weight: bold;
        color: $text-primary;
      }

      .rank-badge {
        display: flex;
        gap: 12rpx;
        align-items: center;

        .rank-name {
          font-size: 22rpx;
          color: $color-primary-dark;
          background-color: #ffe8d8;
          padding: 4rpx 16rpx;
          border-radius: $radius-round;
          font-weight: bold;
        }

        .level-tag {
          font-size: 20rpx;
          color: #ffffff;
          background-color: $color-primary;
          padding: 2rpx 12rpx;
          border-radius: $radius-sm;
          font-weight: bold;
        }
      }
    }
  }

  // XP Progress Bar
  .xp-section {
    margin-top: 28rpx;
    display: flex;
    flex-direction: column;
    gap: 10rpx;

    .xp-labels {
      display: flex;
      justify-content: space-between;
      font-size: 22rpx;
      color: $text-secondary;
    }

    .progress-track {
      height: 16rpx;
      background-color: #f0e6df;
      border-radius: $radius-round;
      overflow: hidden;

      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, $color-primary-light 0%, $color-primary 100%);
        border-radius: $radius-round;
        transition: width 0.6s ease;
      }
    }

    .next-rank-hint {
      font-size: 20rpx;
      color: $text-hint;
      text-align: right;
    }
  }
}

// 今日摸鱼看板
.stats-panel {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  gap: 24rpx;

  .panel-header {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
  }

  .grid-stats {
    display: flex;
    gap: 20rpx;

    .stat-card {
      background-color: #fffaf5;
      border: 1rpx solid #fff0e5;
      border-radius: $radius-md;
      padding: 24rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;

      .stat-val {
        font-size: 32rpx;
        font-weight: bold;
        color: $text-primary;
      }

      .salary-text {
        font-size: 52rpx;
        color: $color-primary;
        font-family: 'Courier New', Courier, monospace;
      }

      .stat-label {
        font-size: 22rpx;
        color: $text-hint;
        margin-top: 8rpx;
      }
    }

    .main-stat {
      flex: 1.2;
      border: 2rpx solid #ffd8c0;
      background: linear-gradient(135deg, #fffcf9 0%, #fff4ec 100%);
    }

    .right-stats {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
    }
  }

  .streak-banner {
    display: flex;
    align-items: center;
    background-color: #fff9f0;
    border-radius: $radius-sm;
    padding: 16rpx 20rpx;
    gap: 16rpx;

    .streak-icon {
      font-size: 32rpx;
      animation: pulse 1s infinite alternate;
    }

    .streak-text {
      font-size: 24rpx;
      color: $text-secondary;

      .highlight {
        color: $color-primary-dark;
        font-weight: bold;
        font-size: 28rpx;
      }
    }
  }
}

// 开始按钮
.action-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20rpx 0;

  .pulsing-button-container {
    position: relative;
    width: 260rpx;
    height: 260rpx;
    display: flex;
    justify-content: center;
    align-items: center;

    .poop-btn {
      width: 200rpx;
      height: 200rpx;
      border-radius: $radius-round;
      background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
      box-shadow: 0 12rpx 36rpx rgba(255, 140, 66, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 5;
      transition: all 0.2s ease;

      &:active {
        transform: scale(0.95);
        box-shadow: 0 6rpx 16rpx rgba(255, 140, 66, 0.2);
      }

      .poop-icon {
        font-size: 80rpx;
        line-height: 1;
      }

      .poop-btn-text {
        color: $text-white;
        font-size: 26rpx;
        font-weight: bold;
        margin-top: 4rpx;
      }
    }

    .pulse-wave {
      position: absolute;
      width: 200rpx;
      height: 200rpx;
      border-radius: $radius-round;
      border: 4rpx solid $color-primary-light;
      opacity: 0;
      z-index: 1;
    }

    .wave-1 {
      animation: ripple 2s infinite ease-out;
    }

    .wave-2 {
      animation: ripple 2s infinite ease-out 1s;
    }
  }

  .btn-subtext {
    font-size: 22rpx;
    color: $text-hint;
    margin-top: 16rpx;
  }
}

// 导航网格
.nav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;

  .nav-item {
    background-color: $bg-card;
    border-radius: $radius-md;
    padding: 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: $shadow-sm;
    border: 1rpx solid #ffe8d8;
    transition: all 0.2s ease;

    &:active {
      background-color: #fffbf7;
      transform: translateY(2rpx);
    }

    .nav-icon {
      font-size: 56rpx;
      margin-bottom: 12rpx;
    }

    .nav-name {
      font-size: 26rpx;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .full-width {
    grid-column: span 2;
    flex-direction: row;
    justify-content: flex-start;
    padding: 24rpx 36rpx;
    gap: 24rpx;

    .nav-icon {
      margin-bottom: 0;
      font-size: 48rpx;
    }

    .nav-name {
      flex: 1;
      font-size: 26rpx;
    }

    .nav-arrow {
      color: $text-hint;
      font-size: 24rpx;
    }
  }
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}
</style>
