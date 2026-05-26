<template>
  <view class="badges-container">
    <!-- 顶部选项卡 -->
    <view class="tabs-row">
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'earned' }"
        @tap="activeTab = 'earned'"
      >
        已解锁 ({{ earnedBadges.length }})
      </view>
      <view 
        class="tab-item" 
        :class="{ active: activeTab === 'locked' }"
        @tap="activeTab = 'locked'"
      >
        未解锁 ({{ lockedBadges.length }})
      </view>
    </view>

    <!-- 勋章网格 -->
    <view class="badges-grid" v-if="currentBadges.length > 0">
      <view 
        class="badge-item" 
        v-for="item in currentBadges" 
        :key="item.key"
        :class="[activeTab === 'locked' ? 'locked' : '', item.rarity]"
        @tap="showBadgeDetail(item)"
      >
        <text class="badge-emoji">{{ getBadgeEmoji(item.key) }}</text>
        <text class="badge-name">{{ item.name }}</text>
        <text class="badge-rarity-lbl">{{ formatRarity(item.rarity) }}</text>
      </view>
    </view>
    <view class="empty-state" v-else>
      <text class="empty-emoji">🛡️</text>
      <text class="empty-text">这里空空如也...</text>
    </view>

    <!-- 勋章详情弹窗 -->
    <view class="detail-modal" v-if="selectedBadge" @tap="selectedBadge = null">
      <view class="modal-content" @tap.stop :class="selectedBadge.rarity">
        <text class="modal-emoji">{{ getBadgeEmoji(selectedBadge.key) }}</text>
        <text class="modal-title">{{ selectedBadge.name }}</text>
        
        <view class="rarity-tag" :class="selectedBadge.rarity">
          {{ formatRarity(selectedBadge.rarity) }}
        </view>

        <view class="divider"></view>
        
        <text class="modal-desc">{{ selectedBadge.description }}</text>
        
        <view class="reward-row">
          <text class="reward-label">🏆 晋升奖励：</text>
          <text class="reward-val">+{{ selectedBadge.xp_reward }} XP</text>
        </view>

        <view class="status-row">
          <text class="status-lbl">当前状态：</text>
          <text class="status-val success" v-if="activeTab === 'earned'">已解锁</text>
          <text class="status-val locked-lbl" v-else>尚未解锁</text>
        </view>

        <button class="modal-close-btn" @tap="selectedBadge = null">知道啦</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import type { Badge } from '../../utils/types'

const activeTab = ref<'earned' | 'locked'>('earned')
const earnedBadges = ref<Badge[]>([])
const lockedBadges = ref<Badge[]>([])
const selectedBadge = ref<Badge | null>(null)

onShow(async () => {
  await fetchBadges()
})

const fetchBadges = async () => {
  try {
    const res = await apiCall<{ earned: Badge[]; locked: Badge[] }>('achievement-checker', 'getBadges')
    if (res.code === 0 && res.data) {
      earnedBadges.value = res.data.earned || []
      lockedBadges.value = res.data.locked || []
    }
  } catch (e) {
    console.error(e)
  }
}

const currentBadges = computed(() => {
  return activeTab.value === 'earned' ? earnedBadges.value : lockedBadges.value
})

const showBadgeDetail = (badge: Badge) => {
  selectedBadge.value = badge
}

// 勋章与 Emoji 映射表，使 UI 极其生动有趣！
const getBadgeEmoji = (key: string): string => {
  const emojiMap: { [k: string]: string } = {
    'daily_triple': '🥉',
    'daily_five': '🐷',
    'total_100': '👑',
    'total_500': '🏛️',
    'total_1000': '🌌',
    'flash': '⚡',
    'iron_butt': '🍑',
    'marathon': '🏃',
    'total_hours_10': '⏳',
    'total_hours_100': '⌛',
    'streak_7': '📅',
    'streak_30': '⛈️',
    'streak_100': '⛰️',
    'streak_365': '☀️',
    'earn_100': '💵',
    'earn_1000': '💰',
    'earn_10000': '💎',
    'single_earn_50': '🎫',
    'first_group': '👥',
    'group_leader': '📣',
    'weekly_king': '👑',
    'first_poop': '👶',
    'comfort_five': '😌',
    'early_bird': '🐦',
    'night_owl': '🦉'
  }
  return emojiMap[key] || '🏅'
}

const formatRarity = (rarity: string): string => {
  switch (rarity) {
    case 'common': return '普通勋章'
    case 'rare': return '稀有勋章'
    case 'epic': return '史诗勋章'
    case 'legendary': return '传说勋章'
    default: return '普通勋章'
  }
}
</script>

<style lang="scss" scoped>
.badges-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 选项卡
.tabs-row {
  display: flex;
  background-color: #f0e6df;
  border-radius: $radius-round;
  padding: 8rpx;

  .tab-item {
    flex: 1;
    text-align: center;
    font-size: 26rpx;
    font-weight: bold;
    color: $text-secondary;
    padding: 16rpx 0;
    border-radius: $radius-round;
    transition: all 0.3s ease;

    &.active {
      background-color: $color-primary;
      color: #ffffff;
      box-shadow: 0 4rpx 12rpx rgba(255, 140, 66, 0.3);
    }
  }
}

// 勋章网格
.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  padding-bottom: 40rpx;

  .badge-item {
    background-color: $bg-card;
    border-radius: $radius-md;
    padding: 24rpx 16rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: $shadow-sm;
    border: 1rpx solid #ffe8d8;
    position: relative;
    box-sizing: border-box;

    &:active {
      transform: scale(0.96);
    }

    .badge-emoji {
      font-size: 64rpx;
      margin-bottom: 8rpx;
    }

    .badge-name {
      font-size: 24rpx;
      font-weight: bold;
      color: $text-primary;
    }

    .badge-rarity-lbl {
      font-size: 16rpx;
      color: $text-hint;
      margin-top: 4rpx;
    }
  }

  // 锁定的灰色
  .locked {
    filter: grayscale(100%);
    opacity: 0.55;
    background-color: #f6f6f6;
    border-color: #e0e0e0;
  }

  // 稀有度框色线
  .common { border-color: #e0e0e0; }
  .rare { border-color: #4CAF50; }
  .epic { border-color: #2196F3; }
  .legendary { 
    border-color: #ffc107; 
    box-shadow: 0 0 12rpx rgba(255, 193, 7, 0.2);
  }
}

// 详情弹窗
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;

  .modal-content {
    width: 75%;
    background-color: $bg-card;
    border-radius: $radius-lg;
    padding: 48rpx;
    box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.3);
    border: 4rpx solid #e0e0e0;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: scaleUp 0.3s ease;

    .modal-emoji {
      font-size: 110rpx;
      margin-bottom: 16rpx;
    }

    .modal-title {
      font-size: 34rpx;
      font-weight: 800;
      color: $text-primary;
    }

    .rarity-tag {
      font-size: 20rpx;
      font-weight: bold;
      color: #888888;
      background-color: #f0f0f0;
      padding: 4rpx 16rpx;
      border-radius: 6rpx;
      margin-top: 10rpx;
    }

    // 详情边框色变种
    &.rare {
      border-color: #4CAF50;
      .rarity-tag { color: #ffffff; background-color: #4CAF50; }
    }
    &.epic {
      border-color: #2196F3;
      .rarity-tag { color: #ffffff; background-color: #2196F3; }
    }
    &.legendary {
      border-color: #ffc107;
      .rarity-tag { color: #333333; background-color: #ffc107; }
    }

    .divider {
      width: 100%;
      height: 2rpx;
      background-color: #eeeeee;
      margin: 24rpx 0;
    }

    .modal-desc {
      font-size: 24rpx;
      color: $text-secondary;
      line-height: 1.4;
      margin-bottom: 24rpx;
    }

    .reward-row, .status-row {
      display: flex;
      font-size: 22rpx;
      margin-bottom: 10rpx;

      .reward-label, .status-lbl {
        color: $text-hint;
      }
      .reward-val {
        color: $color-primary-dark;
        font-weight: bold;
      }
      .status-val.success {
        color: $color-success;
        font-weight: bold;
      }
      .status-val.locked-lbl {
        color: #f44336;
        font-weight: bold;
      }
    }

    .modal-close-btn {
      width: 80%;
      background-color: #f5f5f5;
      color: $text-secondary;
      font-size: 26rpx;
      font-weight: bold;
      height: 72rpx;
      line-height: 72rpx;
      border-radius: $radius-round;
      margin-top: 32rpx;
      border: none;
    }
  }
}

// 空白状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .empty-emoji {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }
  .empty-text {
    font-size: 24rpx;
    color: $text-hint;
  }
}

@keyframes scaleUp {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
