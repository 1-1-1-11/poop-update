<template>
  <view class="rank-container" v-if="userStore.user">
    <!-- 用户总经验卡片 -->
    <view class="header-card">
      <text class="label">我的摸鱼总经验值</text>
      <text class="xp-val">{{ userStore.user.total_xp }} <text class="unit">XP</text></text>
      <text class="title-lbl">当前职级：{{ userStore.user.current_title }}</text>
    </view>

    <!-- 职级晋升时间轴 -->
    <view class="rank-list-card">
      <view class="card-title">摸鱼职业生涯路线</view>
      <view class="rank-list">
        <view 
          class="rank-item" 
          v-for="item in TITLE_LEVELS" 
          :key="item.level"
          :class="getRankClass(item)"
        >
          <view class="rank-status-icon">
            <text v-if="isCurrent(item)">👑</text>
            <text v-else-if="isUnlocked(item)">✅</text>
            <text v-else>🔒</text>
          </view>
          
          <view class="rank-info">
            <view class="rank-header">
              <text class="rank-name">{{ item.title }}</text>
              <text class="level-lbl">Lv.{{ item.level }}</text>
            </view>
            <text class="rank-xp-req">解锁门槛: {{ item.minXP }} XP</text>
            
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
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { TITLE_LEVELS, getNextTitle } from '../../utils/salary-calculator'

const userStore = useUserStore()

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

// 当前经验值比例
const xpPercent = computed(() => {
  if (!userStore.user || !nextTitle.value) return 100
  const currentLevelDef = TITLE_LEVELS.find(t => t.level === userStore.user!.current_level)
  const min = currentLevelDef ? currentLevelDef.minXP : 0
  const range = nextTitle.value.minXP - min
  const progressed = userStore.user.total_xp - min
  return Math.min(Math.max(Math.round((progressed / range) * 100), 0), 100)
})
</script>

<style lang="scss" scoped>
.rank-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 头部经验值卡
.header-card {
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-lg;
  padding: 48rpx;
  box-shadow: $shadow-md;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;

  .label {
    font-size: 24rpx;
    opacity: 0.85;
    letter-spacing: 2rpx;
  }

  .xp-val {
    font-size: 80rpx;
    font-weight: 800;
    margin: 16rpx 0;
    text-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);

    .unit {
      font-size: 32rpx;
      font-weight: bold;
    }
  }

  .title-lbl {
    font-size: 28rpx;
    font-weight: bold;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 8rpx 32rpx;
    border-radius: $radius-round;
  }
}

// 职业路线卡
.rank-list-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;

  .card-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    margin-bottom: 40rpx;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
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
  border-radius: $radius-md;
  border: 1rpx solid #eeeeee;
  background-color: #fafafa;
  transition: all 0.2s ease;

  .rank-status-icon {
    font-size: 40rpx;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    line-height: 1.2;
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
        font-size: 28rpx;
        font-weight: bold;
        color: $text-primary;
      }

      .level-lbl {
        font-size: 20rpx;
        color: $text-hint;
        font-weight: bold;
      }
    }

    .rank-xp-req {
      font-size: 22rpx;
      color: $text-hint;
    }
  }
}

// 激活态职级
.rank-current {
  background: linear-gradient(135deg, #fffcf6 0%, #fff6e4 100%);
  border-color: #ffd700;
  box-shadow: 0 4rpx 16rpx rgba(255, 215, 0, 0.2);

  .rank-info .rank-header .rank-name {
    color: $color-primary-dark;
    font-size: 30rpx;
  }

  .rank-info .rank-header .level-lbl {
    color: #ffffff;
    background-color: $color-primary;
    padding: 2rpx 12rpx;
    border-radius: 4rpx;
  }

  .mini-progress-section {
    margin-top: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .mini-progress-track {
      height: 10rpx;
      background-color: #e0e0e0;
      border-radius: 999rpx;
      overflow: hidden;

      .mini-progress-bar {
        height: 100%;
        background-color: $color-primary;
        border-radius: 999rpx;
      }
    }

    .xp-needed-hint {
      font-size: 18rpx;
      color: $text-hint;
      text-align: right;
    }
  }
}

// 已解锁状态
.rank-unlocked {
  background-color: #ffffff;
  border-color: #ffe0cc;

  .rank-info .rank-header .rank-name {
    color: $text-primary;
  }
}

// 锁定状态
.rank-locked {
  opacity: 0.5;
  background-color: #f7f7f7;
  filter: grayscale(100%);
}
</style>
