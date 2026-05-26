<template>
  <view class="result-container">
    <!-- 顶部状态栏替代 -->
    <view class="nav-header">
      <text class="nav-title">如厕小结</text>
    </view>

    <!-- 结算看板 -->
    <view class="receipt-card" :class="feedbackTheme">
      <view class="feedback-banner">
        <text class="feedback-emoji">{{ themeEmoji }}</text>
        <text class="feedback-msg">{{ feedbackMessage }}</text>
      </view>

      <view class="divider"></view>

      <!-- 核心统计项 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="val">{{ formatDuration(poopStore.elapsedSeconds) }}</text>
          <text class="label">本次时长</text>
        </view>
        <view class="stat-item border-left">
          <text class="val earnings-val">¥{{ poopStore.realtimeEarnings.toFixed(2) }}</text>
          <text class="label">带薪收益</text>
        </view>
        <view class="stat-item border-left">
          <text class="val xp-val">+{{ xpEarned }}</text>
          <text class="label">获得经验</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 商品换算 -->
      <view class="equivalent-section" v-if="comparison">
        <text class="eq-icon">{{ comparisonIcon }}</text>
        <view class="eq-content">
          <text class="eq-title">摸鱼成果换算：</text>
          <text class="eq-desc">
            本次如厕赚取的薪资，相当于买到了 <text class="highlight">{{ comparison.quantity_affordable }}</text> 份 <text class="highlight">{{ comparison.item_name }}</text>！
          </text>
        </view>
      </view>
    </view>

    <!-- 评价手记卡片 -->
    <view class="feedback-form-card">
      <view class="form-title">如厕手记</view>

      <!-- 星级选择器 -->
      <view class="form-item">
        <text class="form-label">马桶舒适度评分</text>
        <view class="stars-row">
          <text 
            v-for="star in 5" 
            :key="star" 
            class="star-icon" 
            :class="{ 'star-active': star <= comfortLevel }"
            @tap="comfortLevel = star"
          >
            ★
          </text>
        </view>
      </view>

      <!-- 备注手记 -->
      <view class="form-item">
        <text class="form-label">拉屎吐槽/灵感记录</text>
        <textarea 
          class="notes-textarea" 
          v-model="note" 
          placeholder="写点什么...比如：今天马桶圈挺暖和，或是想出了个绝妙Bug解法。"
          maxlength="200"
        />
        <text class="char-count">{{ note.length }}/200</text>
      </view>

      <button class="save-btn" :loading="saving" @tap="handleSave">
        保存并返回
      </button>
    </view>

    <!-- 升职加薪庆祝弹窗 -->
    <view class="levelup-modal" v-if="showLevelUp">
      <view class="modal-content">
        <view class="ribbon">🎉 恭喜晋升 🎉</view>
        <text class="celebration-emoji">👑</text>
        <text class="congrats-text">老板表示大受震撼！</text>
        <view class="title-compare">
          <text class="old-title">旧职级：{{ userStore.user?.current_title }}</text>
          <text class="arrow">➔</text>
          <text class="new-title">{{ newTitle }}</text>
        </view>
        <text class="level-desc">您的带薪摸鱼水平已达到了新的巅峰，解锁更多特权！</text>
        <button class="modal-btn" @tap="closeLevelUpModal">谢主隆恩</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { getFeedbackType, getFeedbackMessage, formatDuration, calculateSessionXP } from '../../utils/salary-calculator'
import { getBestComparison } from '../../utils/purchase-items'

const userStore = useUserStore()
const poopStore = usePoopStore()

const comfortLevel = ref(3)
const note = ref('')
const saving = ref(false)
const showLevelUp = ref(false)
const newTitle = ref('')

// 反馈类型
const feedbackType = computed(() => {
  return getFeedbackType(poopStore.elapsedSeconds)
})

// 经验值估算 (为了展示)
const xpEarned = computed(() => {
  return calculateSessionXP(poopStore.elapsedSeconds, comfortLevel.value as any, userStore.user?.streak_days ? userStore.user.streak_days > 0 : false)
})

// 根据反馈类型设定样式类
const feedbackTheme = computed(() => {
  switch (feedbackType.value) {
    case 'praise': return 'theme-praise'
    case 'encourage': return 'theme-encourage'
    default: return 'theme-normal'
  }
})

const themeEmoji = computed(() => {
  switch (feedbackType.value) {
    case 'praise': return '⚡'
    case 'encourage': return '🍃'
    default: return '✅'
  }
})

const feedbackMessage = computed(() => {
  return getFeedbackMessage(feedbackType.value)
})

// 最佳商品换算
const comparison = computed(() => {
  return getBestComparison(poopStore.realtimeEarnings)
})

const comparisonIcon = computed(() => {
  if (!comparison.value) return '🎁'
  const iconMap: { [k: string]: string } = {
    'coffee': '☕',
    'ice-cream': '🍦',
    'bubble-tea': '🥤',
    'pancake': '🥞',
    'bao': '🥟',
    'metro': '🚇',
    'cola': '🥤',
    'water': '💧',
    'noodle': '🍜',
    'vip': '🎫',
    'burger': '🍔',
    'movie': '🎬',
    'takeout': '🥡',
    'sneaker': '👟',
    'game': '🎮',
    'phone': '📱'
  }
  return iconMap[comparison.value.icon] || '🎁'
})

const handleSave = async () => {
  saving.value = true
  const res = await poopStore.savePoop(comfortLevel.value, note.value.trim())
  saving.value = false

  if (res && res.code === 0 && res.data) {
    if (res.data.leveled_up) {
      newTitle.value = res.data.current_title
      showLevelUp.value = true
      // 触发出升职提示音或振动
      uni.vibrateLong({})
    } else {
      uni.showToast({ title: '记录已保存', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 1200)
    }
  } else {
    uni.showToast({
      title: res?.msg || '保存失败，请重试',
      icon: 'none'
    })
  }
}

const closeLevelUpModal = () => {
  showLevelUp.value = false
  uni.switchTab({
    url: '/pages/index/index'
  })
}
</script>

<style lang="scss" scoped>
.result-container {
  min-height: 100vh;
  background-color: $bg-primary;
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.nav-header {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .nav-title {
    font-size: 34rpx;
    font-weight: bold;
    color: $text-primary;
  }
}

// 结算卡片主题样式
.receipt-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-md;
  border: 2rpx solid #ffd8c0;
  display: flex;
  flex-direction: column;
  gap: 28rpx;

  .feedback-banner {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .feedback-emoji {
      font-size: 48rpx;
    }

    .feedback-msg {
      font-size: 30rpx;
      font-weight: bold;
      color: $text-primary;
    }
  }

  .divider {
    height: 2rpx;
    background-color: #f3f3f3;
  }

  .stats-row {
    display: flex;
    justify-content: space-around;
    text-align: center;

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .val {
        font-size: 36rpx;
        font-weight: bold;
        color: $text-primary;
      }

      .earnings-val {
        color: $color-primary;
        font-family: 'Courier New', Courier, monospace;
        font-size: 44rpx;
      }

      .xp-val {
        color: $color-success;
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

  .equivalent-section {
    display: flex;
    background-color: #fff9f4;
    border-radius: $radius-sm;
    padding: 20rpx;
    gap: 16rpx;
    align-items: center;
    border: 1rpx solid #fff0e2;

    .eq-icon {
      font-size: 48rpx;
    }

    .eq-content {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      flex: 1;

      .eq-title {
        font-size: 24rpx;
        font-weight: bold;
        color: $text-secondary;
      }

      .eq-desc {
        font-size: 22rpx;
        color: $text-secondary;

        .highlight {
          color: $color-primary-dark;
          font-weight: bold;
        }
      }
    }
  }
}

// 主题变体样式
.theme-praise {
  border-color: #ffd700;
  background: linear-gradient(180deg, #ffffff 0%, #fffdf0 100%);
  .feedback-msg { color: #ccac00; }
  .earnings-val { color: #d4af37; }
}

.theme-encourage {
  border-color: #ffb3b3;
  background: linear-gradient(180deg, #ffffff 0%, #fff5f5 100%);
  .feedback-msg { color: #e63946; }
  .earnings-val { color: #e63946; }
}

// 手记表单
.feedback-form-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  gap: 32rpx;

  .form-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 16rpx;

    .form-label {
      font-size: 24rpx;
      color: $text-secondary;
      font-weight: 600;
    }

    .stars-row {
      display: flex;
      gap: 16rpx;

      .star-icon {
        font-size: 56rpx;
        color: #e0e0e0;
        cursor: pointer;
        line-height: 1;
        transition: color 0.15s ease;
      }

      .star-active {
        color: #ffc107;
      }
    }

    .notes-textarea {
      width: 100%;
      height: 160rpx;
      background-color: #fafafa;
      border: 1rpx solid #e0e0e0;
      border-radius: $radius-sm;
      padding: 16rpx;
      font-size: 26rpx;
      color: $text-primary;
      box-sizing: border-box;
    }

    .char-count {
      font-size: 20rpx;
      color: $text-hint;
      text-align: right;
      margin-top: -8rpx;
    }
  }

  .save-btn {
    background: linear-gradient(90deg, $color-primary 0%, $color-primary-dark 100%);
    color: $text-white;
    font-size: 32rpx;
    font-weight: bold;
    height: 96rpx;
    line-height: 96rpx;
    border-radius: $radius-round;
    border: none;
    box-shadow: 0 8rpx 20rpx rgba(255, 140, 66, 0.4);
    margin-top: 16rpx;

    &:active {
      transform: scale(0.98);
    }
  }
}

// 升职弹窗
.levelup-modal {
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
  animation: fadeIn 0.3s ease;

  .modal-content {
    width: 80%;
    background: linear-gradient(135deg, #ffffff 0%, #fffcf0 100%);
    border-radius: $radius-lg;
    padding: 60rpx 40rpx;
    box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.3);
    border: 4rpx solid #ffd700;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    animation: scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    .ribbon {
      background-color: #ffd700;
      color: #333333;
      font-weight: bold;
      font-size: 34rpx;
      padding: 10rpx 40rpx;
      border-radius: $radius-round;
      position: absolute;
      top: -30rpx;
      box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.15);
    }

    .celebration-emoji {
      font-size: 120rpx;
      margin-top: 20rpx;
      animation: spin 3s infinite linear;
    }

    .congrats-text {
      font-size: 32rpx;
      font-weight: bold;
      color: #b8860b;
      margin-top: 24rpx;
    }

    .title-compare {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin: 28rpx 0;
      background-color: #fff9e0;
      padding: 12rpx 24rpx;
      border-radius: $radius-sm;

      .old-title {
        font-size: 24rpx;
        color: #888888;
      }
      .arrow {
        color: #b8860b;
        font-weight: bold;
      }
      .new-title {
        font-size: 28rpx;
        font-weight: 800;
        color: $color-primary-dark;
      }
    }

    .level-desc {
      font-size: 22rpx;
      color: #666666;
      margin-bottom: 40rpx;
    }

    .modal-btn {
      width: 80%;
      background: linear-gradient(90deg, #ffc107 0%, #ffa000 100%);
      color: #333333;
      font-weight: bold;
      font-size: 28rpx;
      height: 80rpx;
      line-height: 80rpx;
      border-radius: $radius-round;
      border: none;
      box-shadow: 0 6rpx 16rpx rgba(255, 193, 7, 0.4);
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes spin {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}
</style>
