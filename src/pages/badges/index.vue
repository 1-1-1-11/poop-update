<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 顶部选项卡 (扁平下划线式) -->
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
          class="badge-item-wrap"
          v-for="item in currentBadges" 
          :key="item.key"
          @tap="showBadgeDetail(item)"
        >
          <BadgeIcon 
            :icon="getBadgeEmoji(item.key)" 
            :rarity="item.rarity" 
            :unlocked="activeTab === 'earned'"
          />
          <text class="badge-name">{{ item.name }}</text>
          <text class="badge-rarity-lbl">{{ formatRarity(item.rarity) }}</text>
        </view>
      </view>
      <view class="empty-state" v-else>
        <text class="empty-text">NO ACHIEVEMENT / 暂无勋章</text>
      </view>

      <!-- 勋章详情弹窗 (扁平弹框) -->
      <view class="detail-modal" v-if="selectedBadge" @tap="selectedBadge = null">
        <ThemeCard customClass="modal-content-flat" @click.stop :class="selectedBadge.rarity">
          <BadgeIcon 
            :icon="getBadgeEmoji(selectedBadge.key)" 
            :rarity="selectedBadge.rarity" 
            :unlocked="activeTab === 'earned'"
          />
          <text class="modal-title">{{ selectedBadge.name }}</text>
          
          <view class="rarity-tag" :class="selectedBadge.rarity">
            {{ formatRarity(selectedBadge.rarity) }}
          </view>

          <view class="divider"></view>
          
          <text class="modal-desc">{{ selectedBadge.description }}</text>
          
          <view class="reward-row">
            <text class="reward-label">经验奖励：</text>
            <text class="reward-val">+{{ selectedBadge.xp_reward }} XP</text>
          </view>

          <view class="status-row">
            <text class="status-lbl">当前状态：</text>
            <text class="status-val success" v-if="activeTab === 'earned'">已授予</text>
            <text class="status-val locked-lbl" v-else>尚未解锁</text>
          </view>

          <button class="modal-close-btn" @tap="selectedBadge = null">知道啦</button>
        </ThemeCard>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { useThemeStore } from '../../stores/theme'
import type { Badge } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import BadgeIcon from '../../components/BadgeIcon.vue'

const themeStore = useThemeStore()

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

// 勋章与 Emoji 映射表
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
  if (themeStore.isStock) {
    switch (rarity) {
      case 'common': return '普通交易席勋'
      case 'rare': return '优质交易勋章'
      case 'epic': return '卓越席位勋章'
      case 'legendary': return '传奇殿堂勋章'
      default: return '普通勋章'
    }
  } else {
    switch (rarity) {
      case 'common': return '普通实验奖章'
      case 'rare': return '核心科研奖章'
      case 'epic': return '重点成就奖章'
      case 'legendary': return '至高学术奖章'
      default: return '普通奖章'
    }
  }
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

// 选项卡 (扁平下划线)
.tabs-row {
  display: flex;
  border-bottom: 2rpx solid var(--border);
  padding: 0;

  .tab-item {
    flex: 1;
    text-align: center;
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-secondary);
    padding: 24rpx 0;
    border-bottom: 4rpx solid transparent;
    transition: all 0.2s ease;

    &.active {
      border-bottom-color: var(--accent);
      color: var(--accent);
    }
  }
}

// 勋章网格
.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding-bottom: 40rpx;

  .badge-item-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
    cursor: pointer;

    &:active {
      opacity: 0.8;
    }

    .badge-name {
      font-size: 22rpx;
      font-weight: 800;
      color: var(--text-primary);
      margin-top: 12rpx;
    }

    .badge-rarity-lbl {
      font-size: 18rpx;
      color: var(--text-secondary);
      margin-top: 4rpx;
    }
  }
}

// 详情弹窗
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;

  .modal-content-flat {
    width: 75%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    border: 1rpx solid var(--border);
    padding: 40rpx;
    box-sizing: border-box;

    .modal-title {
      font-size: 28rpx;
      font-weight: 800;
      color: var(--text-primary);
      margin-top: 16rpx;
      letter-spacing: 1rpx;
    }

    .rarity-tag {
      font-size: 18rpx;
      font-weight: bold;
      color: var(--text-secondary);
      background-color: var(--border);
      padding: 4rpx 16rpx;
      margin-top: 10rpx;
      font-family: var(--font-mono);
    }

    // Details borders mapping
    &.rare {
      border-color: #3498DB;
      .rarity-tag { color: #ffffff; background-color: #3498DB; }
    }
    &.epic {
      border-color: #9B59B6;
      .rarity-tag { color: #ffffff; background-color: #9B59B6; }
    }
    &.legendary {
      border-color: #F1C40F;
      .rarity-tag { color: #333333; background-color: #F1C40F; }
    }

    .divider {
      width: 100%;
      height: 1rpx;
      background-color: var(--border);
      margin: 24rpx 0;
    }

    .modal-desc {
      font-size: 22rpx;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 24rpx;
    }

    .reward-row, .status-row {
      display: flex;
      font-size: 20rpx;
      margin-bottom: 10rpx;

      .reward-label, .status-lbl {
        color: var(--text-secondary);
      }
      .reward-val {
        color: var(--accent-warn);
        font-weight: 800;
        font-family: var(--font-mono);
      }
      .status-val.success {
        color: var(--accent);
        font-weight: bold;
      }
      .status-val.locked-lbl {
        color: var(--accent-warn);
        font-weight: bold;
      }
    }

    .modal-close-btn {
      width: 80%;
      background-color: var(--accent);
      color: #ffffff;
      font-size: 24rpx;
      font-weight: 800;
      height: 80rpx;
      line-height: 80rpx;
      border-radius: var(--radius-sm, 4rpx);
      margin-top: 32rpx;
      border: none;
      letter-spacing: 1rpx;
      text-transform: uppercase;

      &:active {
        opacity: 0.9;
      }
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

  .empty-text {
    font-size: 22rpx;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
  }
}
</style>
