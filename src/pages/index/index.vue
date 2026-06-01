<template>
  <view class="page-container" :class="themeStore.themeClass" v-if="userStore.user">
    <PageTransition>
      <!-- 头部个人资料及职级 (扁平悬浮) -->
      <view class="profile-header-flat">
        <view class="user-info">
          <image class="avatar" :src="userStore.user.avatar_url || '/static/images/tab-profile-active.png'" mode="aspectFill" />
          <view class="name-rank">
            <text class="nickname">{{ userStore.user.nickname }}</text>
            <view class="rank-badge">
              <text class="rank-name">{{ userStore.user.current_title }}</text>
              <text class="level-tag">Lv.{{ userStore.user.current_level }}</text>
            </view>
          </view>
        </view>

        <!-- XP 极细进度线 -->
        <view class="xp-section-flat" v-if="nextTitle">
          <view class="xp-labels">
            <text class="xp-text">{{ themeStore.t('xpProgress') }} {{ userStore.user.total_xp }} / {{ nextTitle.minXP }}</text>
            <text class="xp-percent">{{ xpPercent }}%</text>
          </view>
          <view class="progress-track-flat">
            <view class="progress-bar-flat" :style="{ width: xpPercent + '%' }"></view>
          </view>
          <text class="next-rank-hint">
            距离下一席位还需 {{ nextTitle.minXP - userStore.user.total_xp }} XP
          </text>
        </view>
      </view>

      <!-- 今日数据面板 (扁平非对称式对账单) -->
      <ThemeCard customClass="dashboard-panel">
        <view class="panel-header-flat">{{ themeStore.t('todayReport') }}</view>
        
        <view class="dashboard-content">
          <!-- 左侧大额盈利展示 -->
          <view class="dashboard-left">
            <text class="lbl-small">今日累计{{ themeStore.t('earnings') }}</text>
            <view class="main-val-box">
              <NumberTicker 
                class="main-val-num" 
                :value="todayEarnings" 
                prefix="¥" 
                :precision="2" 
              />
            </view>
          </view>

          <!-- 中间分界线 -->
          <view class="vertical-divider"></view>

          <!-- 右侧小项对账 -->
          <view class="dashboard-right">
            <view class="side-item">
              <text class="side-lbl">{{ themeStore.t('todayCount') }}</text>
              <NumberTicker 
                class="side-val" 
                :value="todayCount" 
                suffix="次" 
                :precision="0" 
              />
            </view>
            <view class="side-item">
              <text class="side-lbl">{{ themeStore.t('poopDuration') }}</text>
              <text class="side-val font-normal">{{ formatDuration(todayDuration) }}</text>
            </view>
          </view>
        </view>

        <!-- 极简打卡条 -->
        <view class="streak-mini-row">
          <view class="indicator-dot"></view>
          <text class="streak-text">
            {{ streakText }}已连续 {{ userStore.user.streak_days || 0 }} 天。
          </text>
        </view>
      </ThemeCard>

      <!-- 核心开盘操作控制台 -->
      <view class="action-console">
        <view class="interactive-deck" @tap="handleStartPoop">
          <view class="deck-indicator-glowing"></view>
          <text class="deck-btn-text">{{ themeStore.t('startPoop') }}</text>
          <text class="deck-btn-action">EXECUTE</text>
        </view>
        <text class="console-subtext">// {{ buttonSubtext }}</text>
      </view>

      <!-- 扁平列表式导航 (去方块卡片化) -->
      <view class="nav-list-flat">
        <view class="nav-row" @tap="navigateTo('/pages/fortune/index')">
          <view class="row-left">
            <text class="row-bullet">■</text>
            <text class="row-name">{{ themeStore.t('navFortune') }}</text>
          </view>
          <text class="row-arrow">❯</text>
        </view>

        <view class="nav-row" @tap="navigateTo('/pages/weekly-report/index')">
          <view class="row-left">
            <text class="row-bullet">■</text>
            <text class="row-name">{{ themeStore.t('navWeekly') }}</text>
          </view>
          <text class="row-arrow">❯</text>
        </view>

        <view class="nav-row" @tap="navigateTo('/pages/rank/index')">
          <view class="row-left">
            <text class="row-bullet">■</text>
            <text class="row-name">{{ themeStore.t('navRank') }}</text>
          </view>
          <text class="row-arrow">❯</text>
        </view>

        <view class="nav-row" @tap="navigateTo('/pages/badges/index')">
          <view class="row-left">
            <text class="row-bullet">■</text>
            <text class="row-name">{{ themeStore.t('navBadge') }}</text>
          </view>
          <text class="row-arrow">❯</text>
        </view>

        <view class="nav-row full-width-row" @tap="navigateTo('/pages/social/index')">
          <view class="row-left">
            <text class="row-bullet text-accent">■</text>
            <text class="row-name font-bold">{{ themeStore.t('navSocial') }}</text>
          </view>
          <text class="row-arrow">❯</text>
        </view>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { useThemeStore } from '../../stores/theme'
import { getNextTitle, TITLE_LEVELS } from '../../utils/salary-calculator'
import { formatDuration } from '../../utils/salary-calculator'
import { getLocalDateString } from '../../utils/formatters'
import { apiCall } from '../../services/api'
import type { StatsData } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const poopStore = usePoopStore()
const themeStore = useThemeStore()

const todayEarnings = ref<number>(0)
const todayCount = ref<number>(0)
const todayDuration = ref<number>(0)

onShow(async () => {
  const loggedIn = await userStore.loadProfile()
  if (!loggedIn) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }

  await fetchTodayStats()

  poopStore.restoreSession(
    userStore.user!.monthly_salary,
    userStore.user!.work_days_per_month,
    userStore.user!.work_hours_per_day
  )

  if (poopStore.isPooping) {
    uni.navigateTo({
      url: '/pages/timer/index'
    })
  }
})

const fetchTodayStats = async () => {
  try {
    const res = await apiCall<StatsData>('session-manager', 'stats', { period: 'week' })
    if (res.code === 0 && res.data?.daily_distribution) {
      const todayStr = getLocalDateString(Date.now())
      const todayData = res.data.daily_distribution.find((d: any) => d.date === todayStr)
      if (todayData) {
        todayEarnings.value = todayData.earnings
        todayCount.value = todayData.sessions
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

const nextTitle = computed(() => {
  if (!userStore.user) return null
  return getNextTitle(userStore.user.current_level)
})

const xpPercent = computed(() => {
  if (!userStore.user || !nextTitle.value) return 100
  const currentLevelDef = TITLE_LEVELS.find(t => t.level === userStore.user!.current_level)
  const min = currentLevelDef ? currentLevelDef.minXP : 0
  const range = nextTitle.value.minXP - min
  const progressed = userStore.user.total_xp - min
  return Math.min(Math.max(Math.round((progressed / range) * 100), 0), 100)
})

const streakText = computed(() => {
  return themeStore.isStock
    ? '交易委托正常开市中，'
    : '科学反应进程运转正常，'
})

const buttonSubtext = computed(() => {
  return themeStore.isStock
    ? 'TERMINAL COMMITTED: 实时套利计算端'
    : 'REACTOR ONLINE: 实验室能量反应器'
})

const navigateTo = (path: string) => {
  uni.navigateTo({ url: path })
}

const handleStartPoop = () => {
  if (!userStore.user) return
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
.page-container {
  padding: 40rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

// 扁平化头部
.profile-header-flat {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  width: 100%;

  .user-info {
    display: flex;
    align-items: center;
    gap: 24rpx;

    .avatar {
      width: 90rpx;
      height: 90rpx;
      border-radius: var(--radius-round);
      border: 2rpx solid var(--accent);
    }

    .name-rank {
      display: flex;
      flex-direction: column;
      gap: 4rpx;

      .nickname {
        font-size: 32rpx;
        font-weight: 800;
        color: var(--text-primary);
      }

      .rank-badge {
        display: flex;
        gap: 12rpx;
        align-items: center;

        .rank-name {
          font-size: 20rpx;
          color: var(--text-secondary);
          font-weight: bold;
        }

        .level-tag {
          font-size: 18rpx;
          color: #ffffff;
          background-color: var(--accent);
          padding: 2rpx 10rpx;
          border-radius: 4rpx;
          font-weight: bold;
        }
      }
    }
  }

  // XP 极细进度条线
  .xp-section-flat {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    margin-top: 10rpx;

    .xp-labels {
      display: flex;
      justify-content: space-between;
      font-size: 18rpx;
      color: var(--text-secondary);
      font-weight: bold;
    }

    .progress-track-flat {
      height: 6rpx;
      background-color: var(--border);
      overflow: hidden;

      .progress-bar-flat {
        height: 100%;
        background-color: var(--accent);
        transition: width 0.6s ease;
      }
    }

    .next-rank-hint {
      font-size: 18rpx;
      color: var(--text-secondary);
      opacity: 0.8;
    }
  }
}

// 扁平非对称仪表盘
.dashboard-panel {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .panel-header-flat {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 2rpx;
  }

  .dashboard-content {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .dashboard-left {
    flex: 1.3;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .lbl-small {
      font-size: 18rpx;
      color: var(--text-secondary);
      margin-bottom: 4rpx;
    }

    .main-val-box {
      display: flex;
      align-items: baseline;

      .main-val-num {
        font-size: 54rpx;
        font-weight: 800;
        color: var(--accent);
        font-family: var(--font-mono);
      }
    }
  }

  .vertical-divider {
    width: 2rpx;
    height: 90rpx;
    background-color: var(--border);
    margin: 0 32rpx;
  }

  .dashboard-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;

    .side-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .side-lbl {
        font-size: 18rpx;
        color: var(--text-secondary);
      }

      .side-val {
        font-size: 24rpx;
        font-weight: bold;
        color: var(--text-primary);
        font-family: var(--font-mono);
      }
      
      .font-normal {
        font-family: inherit !important;
      }
    }
  }

  .streak-mini-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    border-top: 1rpx solid var(--border);
    padding-top: 16rpx;

    .indicator-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
      background-color: var(--accent);
      animation: blink 2.5s infinite;
    }

    .streak-text {
      font-size: 20rpx;
      color: var(--text-secondary);
    }
  }
}

// 核心操作控制台
.action-console {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30rpx 0;
  width: 100%;

  .interactive-deck {
    width: 100%;
    height: 100rpx;
    background-color: var(--accent);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40rpx;
    box-sizing: border-box;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:active {
      opacity: 0.9;
    }

    .deck-indicator-glowing {
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background-color: var(--accent-info);
      box-shadow: 0 0 12rpx var(--accent-info);
    }

    .deck-btn-text {
      font-size: 28rpx;
      font-weight: 800;
      letter-spacing: 4rpx;
    }

    .deck-btn-action {
      font-size: 20rpx;
      font-weight: bold;
      opacity: 0.8;
      font-family: var(--font-mono);
    }
  }

  .console-subtext {
    font-size: 18rpx;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    margin-top: 12rpx;
  }
}

// 扁平列表导航 (去宫格卡片)
.nav-list-flat {
  display: flex;
  flex-direction: column;
  width: 100%;

  .nav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx 0;
    border-bottom: 1rpx solid var(--border);

    &:active {
      opacity: 0.7;
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .row-bullet {
        font-size: 16rpx;
        color: var(--text-secondary);
        transform: scale(0.8);
      }

      .row-name {
        font-size: 26rpx;
        font-weight: 600;
        color: var(--text-primary);
      }

      .text-accent {
        color: var(--accent-warn) !important;
      }
      
      .font-bold {
        font-weight: 800 !important;
      }
    }

    .row-arrow {
      color: var(--text-secondary);
      font-size: 20rpx;
    }
  }
}

@keyframes blink {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
</style>
