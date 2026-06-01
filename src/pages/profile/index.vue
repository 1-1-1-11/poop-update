<template>
  <view class="page-container" :class="themeStore.themeClass" v-if="userStore.user">
    <PageTransition>
      <!-- 用户信息头部 (扁平对账行) -->
      <view class="user-profile-header-flat">
        <image class="avatar" :src="userStore.user.avatar_url || '/static/images/tab-profile-active.png'" mode="aspectFill" />
        <view class="user-meta">
          <text class="nickname">{{ userStore.user.nickname }}</text>
          <text class="uid">ID: {{ userStore.user._id }}</text>
        </view>
        <view class="rank-badge-flat">
          <text class="rank-title">{{ userStore.user.current_title }}</text>
          <text class="level-lbl">Lv.{{ userStore.user.current_level }}</text>
        </view>
      </view>

      <!-- 生涯概览数据板 (扁平总账) -->
      <view class="stats-overview-flat">
        <view class="overview-item">
          <NumberTicker 
            class="val" 
            :value="userStore.user.total_poop_earnings" 
            prefix="¥" 
            :precision="2" 
          />
          <text class="label">累计{{ themeStore.t('earnings') }}</text>
        </view>
        <view class="overview-item border-left">
          <NumberTicker 
            class="val" 
            :value="userStore.user.total_sessions" 
            suffix="次" 
            :precision="0" 
          />
          <text class="label">累计{{ themeStore.t('todayCount') }}</text>
        </view>
        <view class="overview-item border-left">
          <NumberTicker 
            class="val" 
            :value="userStore.user.streak_days" 
            suffix="天" 
            :precision="0" 
          />
          <text class="label">连续打卡</text>
        </view>
      </view>

      <!-- 视觉主题切换 -->
      <view class="settings-group-flat">
        <view class="group-title">系统视觉主题</view>
        <view class="menu-item-flat" @tap="switchTheme">
          <text class="menu-label">当前主题风格</text>
          <view class="theme-value-btn">
            <text class="theme-value-text">{{ themeStore.isStock ? 'STOCK EXCHANGE / 交易所' : 'RESEARCH LAB / 实验室' }}</text>
            <text class="switch-badge-action">切换</text>
          </view>
        </view>
      </view>

      <!-- 功能设置区 -->
      <view class="settings-group-flat">
        <view class="group-title">摸鱼参数设置</view>

        <!-- 久蹲提醒阈值 -->
        <view class="menu-item-flat">
          <text class="menu-label">{{ longSitLabel }}</text>
          <picker :range="longSitMinutesOptions" :value="selectedLongSitIndex" @change="onLongSitMinutesChange">
            <view class="picker-val">
              <text>{{ userStore.user.settings.long_sit_minutes }} 分钟</text>
              <text class="picker-arrow">❯</text>
            </view>
          </picker>
        </view>

        <!-- 开关配置 -->
        <view class="menu-item-flat">
          <text class="menu-label">超时警示推送</text>
          <switch 
            :checked="userStore.user.settings.long_sit_alert" 
            :color="switchColor"
            @change="onToggleSetting('long_sit_alert', $event)" 
          />
        </view>

        <view class="menu-item-flat">
          <text class="menu-label">操作反馈音效</text>
          <switch 
            :checked="userStore.user.settings.sound_enabled" 
            :color="switchColor"
            @change="onToggleSetting('sound_enabled', $event)" 
          />
        </view>

        <view class="menu-item-flat">
          <text class="menu-label">健康喝水提醒</text>
          <switch 
            :checked="userStore.user.settings.hydration_reminder" 
            :color="switchColor"
            @change="onToggleSetting('hydration_reminder', $event)" 
          />
        </view>

        <view class="menu-item-flat">
          <text class="menu-label">定期周报推送</text>
          <switch 
            :checked="userStore.user.settings.weekly_report_push" 
            :color="switchColor"
            @change="onToggleSetting('weekly_report_push', $event)" 
          />
        </view>
      </view>

      <!-- 其他功能路由入口 -->
      <view class="settings-group-flat">
        <view class="group-title">其他功能</view>
        <view class="menu-item-flat" @tap="navigateTo('/pages/salary/index')">
          <text class="menu-label">薪资与基本工时设置</text>
          <text class="menu-arrow">❯</text>
        </view>
        <view class="menu-item-flat" @tap="navigateTo('/pages/badges/index')">
          <text class="menu-label">{{ themeStore.t('navBadge') }}</text>
          <text class="menu-arrow">❯</text>
        </view>
        <view class="menu-item-flat" @tap="navigateTo('/pages/rank/index')">
          <text class="menu-label">{{ themeStore.t('navRank') }}路线</text>
          <text class="menu-arrow">❯</text>
        </view>
      </view>

      <!-- 重置清空本地 Mock -->
      <view class="danger-zone">
        <button class="reset-btn" @tap="handleReset">
          重置并清理本地全部数据
        </button>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { useThemeTransition } from '../../composables/useThemeTransition'

// Components
import PageTransition from '../../components/PageTransition.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()
const { switchTheme } = useThemeTransition()

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

const switchColor = computed(() => {
  return themeStore.isStock ? '#00E676' : '#3498DB'
})

const longSitLabel = computed(() => {
  return themeStore.isStock ? '单次建议平仓时限' : '反应监测防过载时限'
})

const onLongSitMinutesChange = async (e: any) => {
  const index = e.detail.value
  const minutes = longSitMinutesOptions[index]
  
  if (userStore.user) {
    const success = await userStore.updateUserSettings({
      long_sit_minutes: minutes
    })
    if (success) {
      uni.showToast({ title: `已设置时限为 ${minutes}分钟`, icon: 'none' })
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
    title: '危险操作警示',
    content: '此操作将彻底清理您在本地存储的所有拉屎记录、账单设置、战队属性及解锁徽章，且不可恢复！确定要恢复出厂设置吗？',
    cancelText: '手滑了',
    confirmText: '确定清除',
    confirmColor: '#e74c3c',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '清理完成，正在重启', icon: 'success' })
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
.page-container {
  padding: 40rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

// 用户基本栏 (扁平对账行)
.user-profile-header-flat {
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-bottom: 2rpx solid var(--border);
  padding-bottom: 30rpx;

  .avatar {
    width: 90rpx;
    height: 90rpx;
    border-radius: 50%;
    border: 2rpx solid var(--accent);
    background-color: var(--border);
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
    flex: 1;

    .nickname {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--text-primary);
    }
    .uid {
      font-size: 18rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }

  .rank-badge-flat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8rpx;

    .rank-title {
      font-size: 24rpx;
      font-weight: 800;
      color: var(--accent);
    }

    .level-lbl {
      font-size: 18rpx;
      color: var(--text-primary);
      background-color: var(--border);
      padding: 2rpx 12rpx;
      font-family: var(--font-mono);
      font-weight: bold;
    }
  }
}

// 生涯概况
.stats-overview-flat {
  display: flex;
  justify-content: space-around;
  text-align: center;
  padding: 30rpx 0;
  border-bottom: 1rpx dashed var(--border);

  .overview-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .val {
      font-size: 36rpx;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }

    .label {
      font-size: 20rpx;
      color: var(--text-secondary);
    }
  }

  .border-left {
    border-left: 1rpx solid var(--border);
  }
}

// 设置菜单列表
.settings-group-flat {
  display: flex;
  flex-direction: column;
  width: 100%;

  .group-title {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
    margin-bottom: 16rpx;
  }

  .menu-item-flat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx 0;
    border-bottom: 1rpx solid var(--border);
    font-size: 24rpx;
    color: var(--text-primary);

    &:active {
      opacity: 0.8;
    }

    .menu-label {
      font-weight: 600;
    }

    .menu-arrow {
      color: var(--text-secondary);
      font-size: 20rpx;
    }

    .theme-value-btn {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .theme-value-text {
        font-size: 22rpx;
        font-weight: bold;
        color: var(--accent);
      }

      .switch-badge-action {
        font-size: 18rpx;
        color: #ffffff;
        background-color: var(--accent);
        padding: 4rpx 16rpx;
        font-family: var(--font-mono);
        text-transform: uppercase;
      }
    }

    .picker-val {
      display: flex;
      align-items: center;
      gap: 12rpx;
      color: var(--accent-warn);
      font-weight: bold;

      .picker-arrow {
        color: var(--text-secondary);
        font-size: 20rpx;
        font-weight: normal;
      }
    }
  }
}

.danger-zone {
  margin-top: 40rpx;
  width: 100%;

  .reset-btn {
    background-color: transparent;
    color: var(--accent-warn);
    font-size: 24rpx;
    font-weight: 800;
    border: 1rpx solid var(--accent-warn);
    border-radius: var(--radius-sm, 4rpx);
    height: 88rpx;
    line-height: 88rpx;
    letter-spacing: 1rpx;

    &:active {
      background-color: rgba(231, 76, 60, 0.05);
    }
  }
}
</style>
