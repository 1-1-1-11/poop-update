<template>
  <view class="profile-container" v-if="userStore.user">
    <!-- 用户信息头部 -->
    <view class="user-card">
      <view class="avatar-row">
        <image class="avatar" :src="userStore.user.avatar_url || '/static/images/tab-profile-active.png'" mode="aspectFill" />
        <view class="user-meta">
          <text class="nickname">{{ userStore.user.nickname }}</text>
          <text class="uid">账号ID: {{ userStore.user._id }}</text>
        </view>
      </view>
      <view class="rank-row">
        <text class="rank-title">🏆 当前职级：{{ userStore.user.current_title }}</text>
        <text class="level-lbl">Lv.{{ userStore.user.current_level }}</text>
      </view>
    </view>

    <!-- 生涯概览数据板 -->
    <view class="stats-overview">
      <view class="overview-item">
        <text class="val">¥{{ userStore.user.total_poop_earnings.toFixed(2) }}</text>
        <text class="label">带薪总收入</text>
      </view>
      <view class="overview-item border-left">
        <text class="val">{{ userStore.user.total_sessions }}</text>
        <text class="label">累计次数</text>
      </view>
      <view class="overview-item border-left">
        <text class="val">{{ userStore.user.streak_days }}</text>
        <text class="label">当前连击(天)</text>
      </view>
    </view>

    <!-- 功能设置区 -->
    <view class="menu-card">
      <view class="card-title">摸鱼参数设置</view>

      <!-- 久蹲提醒阈值 -->
      <view class="menu-item no-arrow">
        <text class="menu-label">久蹲警示时间</text>
        <picker :range="longSitMinutesOptions" :value="selectedLongSitIndex" @change="onLongSitMinutesChange">
          <view class="picker-val">
            <text>{{ userStore.user.settings.long_sit_minutes }} 分钟</text>
            <text class="picker-arrow">❯</text>
          </view>
        </picker>
      </view>

      <!-- 开关配置 -->
      <view class="menu-item no-arrow">
        <text class="menu-label">久蹲声音/震动警报</text>
        <switch 
          :checked="userStore.user.settings.long_sit_alert" 
          color="#FF8C42"
          @change="onToggleSetting('long_sit_alert', $event)" 
        />
      </view>

      <view class="menu-item no-arrow">
        <text class="menu-label">如厕音效开关</text>
        <switch 
          :checked="userStore.user.settings.sound_enabled" 
          color="#FF8C42"
          @change="onToggleSetting('sound_enabled', $event)" 
        />
      </view>

      <view class="menu-item no-arrow">
        <text class="menu-label">喝水摸鱼提醒</text>
        <switch 
          :checked="userStore.user.settings.hydration_reminder" 
          color="#FF8C42"
          @change="onToggleSetting('hydration_reminder', $event)" 
        />
      </view>

      <view class="menu-item no-arrow">
        <text class="menu-label">每周摸鱼账单推送</text>
        <switch 
          :checked="userStore.user.settings.weekly_report_push" 
          color="#FF8C42"
          @change="onToggleSetting('weekly_report_push', $event)" 
        />
      </view>
    </view>

    <!-- 其他功能路由入口 -->
    <view class="menu-card">
      <view class="card-title">其他功能</view>
      <view class="menu-item" @tap="navigateTo('/pages/salary/index')">
        <text class="menu-label">薪资架构设置</text>
        <text class="menu-arrow">❯</text>
      </view>
      <view class="menu-item" @tap="navigateTo('/pages/badges/index')">
        <text class="menu-label">我的成就勋章馆</text>
        <text class="menu-arrow">❯</text>
      </view>
      <view class="menu-item" @tap="navigateTo('/pages/rank/index')">
        <text class="menu-label">摸鱼升职职级表</text>
        <text class="menu-arrow">❯</text>
      </view>
    </view>

    <!-- 重置清空本地 Mock -->
    <view class="danger-zone">
      <button class="reset-btn" @tap="handleReset">
        重置/清理本地数据 (重新注册)
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

// 久蹲时间选项: 5, 10, 15, 20, 25, 30, 45, 60 分钟
const longSitMinutesOptions = [5, 10, 15, 20, 25, 30, 45, 60]

const selectedLongSitIndex = computed(() => {
  if (!userStore.user) return 3 // 默认20分钟
  const mins = userStore.user.settings.long_sit_minutes
  const idx = longSitMinutesOptions.indexOf(mins)
  return idx !== -1 ? idx : 3
})

onShow(() => {
  userStore.loadProfile()
})

const onLongSitMinutesChange = async (e: any) => {
  const index = e.detail.value
  const minutes = longSitMinutesOptions[index]
  
  if (userStore.user) {
    const success = await userStore.updateUserSettings({
      long_sit_minutes: minutes
    })
    if (success) {
      uni.showToast({ title: `已设置警示时长为 ${minutes}分钟`, icon: 'success' })
    }
  }
}

const onToggleSetting = async (key: string, e: any) => {
  if (userStore.user) {
    const value = e.detail.value
    await userStore.updateUserSettings({
      [key]: value
    })
  }
}

const navigateTo = (path: string) => {
  uni.navigateTo({ url: path })
}

const handleReset = () => {
  uni.showModal({
    title: '极其危险的操作',
    content: '此操作将彻底清理您在本地存储的所有带薪拉屎记录、薪资设置、解锁的成就徽章及组建的战队，且不可恢复！确定重置吗？',
    cancelText: '手滑点错了',
    confirmText: '确定重置',
    confirmColor: '#f44336',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '数据已清空，重置完毕', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/login/index'
          })
        }, 1200)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.profile-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 用户基本卡
.user-card {
  background: linear-gradient(135deg, #ffffff 0%, #fffbf8 100%);
  border-radius: $radius-lg;
  padding: 36rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  gap: 28rpx;

  .avatar-row {
    display: flex;
    align-items: center;
    gap: 24rpx;

    .avatar {
      width: 110rpx;
      height: 110rpx;
      border-radius: $radius-round;
      border: 4rpx solid #ffd8c0;
      background-color: #ffe6d0;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      gap: 6rpx;

      .nickname {
        font-size: 34rpx;
        font-weight: bold;
        color: $text-primary;
      }
      .uid {
        font-size: 20rpx;
        color: $text-hint;
      }
    }
  }

  .rank-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #fffaf5;
    padding: 16rpx 24rpx;
    border-radius: $radius-sm;
    border: 1rpx solid #fff0e2;

    .rank-title {
      font-size: 26rpx;
      font-weight: bold;
      color: $color-primary-dark;
    }

    .level-lbl {
      font-size: 22rpx;
      color: #ffffff;
      background-color: $color-primary;
      padding: 2rpx 16rpx;
      border-radius: $radius-sm;
      font-weight: bold;
    }
  }
}

// 生涯概况
.stats-overview {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 28rpx;
  display: flex;
  justify-content: space-around;
  text-align: center;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;

  .overview-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .val {
      font-size: 36rpx;
      font-weight: bold;
      color: $text-primary;
      font-family: 'Courier New', Courier, monospace;
    }

    .label {
      font-size: 22rpx;
      color: $text-hint;
    }
  }

  .border-left {
    border-left: 2rpx solid #eeeeee;
  }
}

// 设置菜单列表卡片
.menu-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;

  .card-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    margin-bottom: 24rpx;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
  }

  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28rpx 0;
    border-bottom: 2rpx solid #f9f9f9;
    font-size: 26rpx;
    color: $text-primary;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    &:first-of-type {
      padding-top: 10rpx;
    }

    .menu-label {
      font-weight: 500;
    }

    .menu-arrow {
      color: $text-hint;
      font-size: 22rpx;
    }

    .picker-val {
      display: flex;
      align-items: center;
      gap: 12rpx;
      color: $color-primary-dark;
      font-weight: bold;

      .picker-arrow {
        color: $text-hint;
        font-size: 22rpx;
        font-weight: normal;
      }
    }
  }

  .no-arrow {
    cursor: default;
    &:active {
      background-color: transparent;
    }
  }
}

.danger-zone {
  margin-top: 20rpx;
  width: 100%;

  .reset-btn {
    background-color: transparent;
    color: #f44336;
    font-size: 26rpx;
    border: 2rpx solid #ffcdd2;
    border-radius: $radius-round;
    height: 88rpx;
    line-height: 88rpx;

    &:active {
      background-color: #ffebee;
    }
  }
}
</style>
