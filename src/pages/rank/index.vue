<template>
  <view class="page-container" :class="themeStore.themeClass" v-if="userStore.user">
    <PageTransition>
      <!-- 我的累计经验值 (对账总额) -->
      <ThemeCard customClass="xp-board-flat">
        <text class="label">我的累计{{ themeStore.t('xpProgress') }}</text>
        <view class="xp-val-box">
          <NumberTicker class="xp-val" :value="userStore.user.total_xp" :precision="0" />
          <text class="unit"> XP</text>
        </view>
        <view class="title-lbl-flat">当前{{ themeStore.t('rankTitle') }}：{{ userStore.user.current_title }}</view>
      </ThemeCard>

      <!-- 职级晋升时间轴 -->
      <ThemeCard customClass="rank-list-card-flat">
        <view class="card-title">{{ rankListTitle }}</view>
        <view class="rank-list">
          <view 
            class="rank-item" 
            v-for="item in TITLE_LEVELS" 
            :key="item.level"
            :class="getRankClass(item)"
          >
            <view class="rank-status-icon">
              <text class="status-marker" v-if="isCurrent(item)">●</text>
              <text class="status-marker" v-else-if="isUnlocked(item)">○</text>
              <text class="status-marker" v-else>■</text>
            </view>
            
            <view class="rank-info">
              <view class="rank-header">
                <text class="rank-name">{{ item.title }}</text>
                <text class="level-lbl">Lv.{{ item.level }}</text>
              </view>
              <text class="rank-xp-req">{{ thresholdLabel }}: {{ item.minXP }} XP</text>
              
              <!-- 如果是当前职级且未满级，显示进度条 -->
              <view class="mini-progress-section" v-if="isCurrent(item) && nextTitle">
                <view class="mini-progress-track">
                  <view class="mini-progress-bar" :style="{ width: xpPercent + '%' }"></view>
                </view>
                <text class="xp-needed-hint">还需 {{ nextTitle.minXP - userStore.user.total_xp }} XP 升级</text>
              </view>
            </view>
          </view>
        </view>
      </ThemeCard>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { TITLE_LEVELS, getNextTitle } from '../../utils/salary-calculator'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()

onShow(() => {
  userStore.loadProfile()
})

const getRankClass = (item: any): string => {
  if (isCurrent(item)) return 'rank-current'
  if (isUnlocked(item)) return 'rank-unlocked'
  return 'rank-locked'
}

const isCurrent = (item: any): boolean => {
  if (!userStore.user) return false
  return userStore.user.current_level === item.level
}

const isUnlocked = (item: any): boolean => {
  if (!userStore.user) return false
  return userStore.user.total_xp >= item.minXP
}

// 下个职级
const nextTitle = computed(() => {
  if (!userStore.user) return null
  return getNextTitle(userStore.user.current_level)
})

// Dynamic labels
const rankListTitle = computed(() => {
  return themeStore.isStock ? '交易席位进阶路线' : '学术研究职称地图'
})

const thresholdLabel = computed(() => {
  return themeStore.isStock ? '保证金门槛' : '解锁所需经验'
})

const xpPercent = computed(() => {
  if (!userStore.user) return 0
  const currentLevelObj = TITLE_LEVELS.find(l => l.level === userStore.user?.current_level)
  if (!currentLevelObj || !nextTitle.value) return 100
  
  const currentMin = currentLevelObj.minXP
  const nextMin = nextTitle.value.minXP
  const earned = userStore.user.total_xp - currentMin
  const totalNeeded = nextMin - currentMin
  
  return Math.min(Math.max((earned / totalNeeded) * 100, 0), 100)
})
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

// 头部对账单总额板
.xp-board-flat {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .label {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .xp-val-box {
    display: flex;
    align-items: baseline;
    justify-content: center;
    padding: 10rpx 0;

    .xp-val {
      font-size: 64rpx;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--accent);
    }

    .unit {
      font-size: 24rpx;
      font-weight: 800;
      margin-left: 8rpx;
      color: var(--accent);
    }
  }

  .title-lbl-flat {
    font-size: 22rpx;
    font-weight: bold;
    border-top: 1rpx solid var(--border);
    padding-top: 20rpx;
    text-align: center;
    color: var(--text-primary);
  }
}

// 路线卡
.rank-list-card-flat {
  display: flex;
  flex-direction: column;

  .card-title {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    margin-bottom: 40rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.rank-item {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  border: 1rpx solid var(--border);
  background-color: transparent;
  transition: all 0.2s ease;

  .rank-status-icon {
    font-size: 24rpx;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    line-height: 1.2;

    .status-marker {
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-weight: bold;
    }
  }

  .rank-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;

    .rank-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .rank-name {
        font-size: 24rpx;
        font-weight: 800;
        color: var(--text-primary);
      }

      .level-lbl {
        font-size: 18rpx;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: bold;
      }
    }

    .rank-xp-req {
      font-size: 20rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }
}

// 激活态职级
.rank-current {
  border-color: var(--accent);
  background-color: rgba(255, 255, 255, 0.02);

  .rank-status-icon .status-marker {
    color: var(--accent);
  }

  .rank-info .rank-header .rank-name {
    color: var(--accent);
    font-size: 26rpx;
  }

  .rank-info .rank-header .level-lbl {
    color: var(--accent);
  }

  .mini-progress-section {
    margin-top: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .mini-progress-track {
      height: 6rpx;
      background-color: var(--border);
      overflow: hidden;

      .mini-progress-bar {
        height: 100%;
        background-color: var(--accent);
      }
    }

    .xp-needed-hint {
      font-size: 18rpx;
      color: var(--text-secondary);
      text-align: right;
      font-family: var(--font-mono);
    }
  }
}

// 已解锁状态
.rank-unlocked {
  .rank-info .rank-header .rank-name {
    color: var(--text-primary);
  }
}

// 锁定状态
.rank-locked {
  opacity: 0.4;
  background-color: var(--bg-primary);
  filter: grayscale(1);
}
</style>
