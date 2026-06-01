<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 顶部标题 -->
      <view class="nav-header">
        <text class="nav-title">{{ themeStore.t('resultTitle') }}</text>
      </view>

      <!-- 结算对账单 (扁平总账板) -->
      <ThemeCard :customClass="`receipt-board-flat ${feedbackTheme}`">
        <view class="feedback-banner-flat">
          <text class="feedback-msg">// STATUS: {{ feedbackMessage }}</text>
        </view>

        <view class="divider"></view>

        <!-- 核心统计项 -->
        <view class="stats-row">
          <view class="stat-item">
            <text class="val">{{ formatDuration(poopStore.elapsedSeconds) }}</text>
            <text class="label">{{ sessionDurationLabel }}</text>
          </view>
          <view class="stat-item border-left">
            <view class="val earnings-val">
              <NumberTicker :value="poopStore.realtimeEarnings" prefix="¥" :precision="4" />
            </view>
            <text class="label">{{ themeStore.t('earnings') }}</text>
          </view>
          <view class="stat-item border-left">
            <view class="val xp-val">
              <NumberTicker :value="xpEarned" prefix="+" :precision="0" />
            </view>
            <text class="label">获得经验</text>
          </view>
        </view>

        <view class="divider"></view>

        <!-- 商品换算 -->
        <view class="equivalent-section-flat" v-if="comparison">
          <view class="eq-content">
            <text class="eq-title">产出成果换算：</text>
            <text class="eq-desc">{{ equivalentText }}</text>
          </view>
        </view>
      </ThemeCard>

      <!-- 评价手记 (表单扁平化) -->
      <ThemeCard customClass="feedback-form-flat">
        <view class="form-title">{{ themeStore.t('comfortLevel') }}</view>

        <!-- 星级选择器 -->
        <view class="form-item">
          <text class="form-label">{{ comfortQuestion }}</text>
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
          <text class="form-label">{{ noteLabel }}</text>
          <textarea 
            class="notes-textarea" 
            v-model="note" 
            :placeholder="notePlaceholder"
            maxlength="200"
          />
          <text class="char-count">{{ note.length }}/200</text>
        </view>

        <button class="save-btn" :loading="saving" @tap="handleSave">
          {{ themeStore.t('saveButton') }}
        </button>
      </ThemeCard>

      <!-- 升职加薪庆祝弹窗 -->
      <view class="levelup-modal" v-if="showLevelUp">
        <view class="modal-content">
          <view class="ribbon">{{ levelUpRibbon }}</view>
          <text class="congrats-text">{{ levelUpCongrats }}</text>
          <view class="title-compare">
            <text class="old-title">旧级: {{ userStore.user?.current_title }}</text>
            <text class="arrow">➔</text>
            <text class="new-title">{{ newTitle }}</text>
          </view>
          <text class="level-desc">{{ levelUpDesc }}</text>
          <button class="modal-btn" @tap="closeLevelUpModal">{{ levelUpButtonText }}</button>
        </view>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { usePoopStore } from '../../stores/poop'
import { useThemeStore } from '../../stores/theme'
import { getFeedbackType, getFeedbackMessage, formatDuration, calculateSessionXP } from '../../utils/salary-calculator'
import { getBestComparison } from '../../utils/purchase-items'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const poopStore = usePoopStore()
const themeStore = useThemeStore()

const comfortLevel = ref(3)
const note = ref('')
const saving = ref(false)
const showLevelUp = ref(false)
const newTitle = ref('')

// 反馈类型
const feedbackType = computed(() => {
  return getFeedbackType(poopStore.elapsedSeconds)
})

// 经验值估算
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

const feedbackMessage = computed(() => {
  return getFeedbackMessage(feedbackType.value)
})

// 最佳商品换算
const comparison = computed(() => {
  return getBestComparison(poopStore.realtimeEarnings)
})

// Dynamic labels
const sessionDurationLabel = computed(() => {
  return themeStore.isStock ? '持仓周期' : '反应时长'
})

const equivalentText = computed(() => {
  if (!comparison.value) return ''
  return themeStore.isStock
    ? `本次实盘套利赚取的利润，相当于买入了 ${comparison.value.quantity_affordable} 份 ${comparison.value.item_name}！`
    : `本次反应合成赚取的产出，相当于置备了 ${comparison.value.quantity_affordable} 份 ${comparison.value.item_name}！`
})

const comfortQuestion = computed(() => {
  return themeStore.isStock ? '交易操作流畅度评分' : '实验室纯净度评估'
})

const noteLabel = computed(() => {
  return themeStore.isStock ? '交易复盘/灵感记录' : '实验结论/灵感随笔'
})

const notePlaceholder = computed(() => {
  return themeStore.isStock
    ? '写点复盘心得...比如：本次平仓时机极为敏锐，或者想到了优化核心Bug的方法。'
    : '记录实验现象...比如：本反应热效率极高，或者突然破解了系统架构难关。'
})

const levelUpRibbon = computed(() => {
  return themeStore.isStock ? '恭喜晋升席位' : '恭喜晋升职称'
})

const levelUpCongrats = computed(() => {
  return themeStore.isStock 
    ? '交易席位升级，市场表示震撼！' 
    : '科研职称升级，学界表示震撼！'
})

const levelUpDesc = computed(() => {
  return themeStore.isStock
    ? '您的套利水平已达到了新的巅峰，解锁更多高级委托特权！'
    : '您的科研成果已取得了突破性进展，解锁更多国家重点实验室特权！'
})

const levelUpButtonText = computed(() => {
  return themeStore.isStock ? '确认交割' : '存入档案'
})

const handleSave = async () => {
  saving.value = true
  const res = await poopStore.savePoop(comfortLevel.value, note.value.trim())
  saving.value = false

  if (res && res.code === 0 && res.data) {
    if (res.data.leveled_up) {
      newTitle.value = res.data.current_title
      showLevelUp.value = true
      uni.vibrateLong({})
    } else {
      uni.showToast({ title: '记录已保存', icon: 'none' })
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
.page-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.nav-header {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .nav-title {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

// 结算卡片主题样式
.receipt-board-flat {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  border: 1rpx solid var(--border);

  .feedback-banner-flat {
    display: flex;
    align-items: center;

    .feedback-msg {
      font-size: 24rpx;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
  }

  .divider {
    height: 1rpx;
    background-color: var(--border);
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
        font-size: 30rpx;
        font-weight: bold;
        color: var(--text-primary);
      }

      .earnings-val {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 34rpx;
      }

      .xp-val {
        color: var(--accent-info);
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

  .equivalent-section-flat {
    display: flex;
    background-color: var(--bg-primary);
    padding: 20rpx;
    align-items: center;
    border: 1rpx solid var(--border);

    .eq-content {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      flex: 1;

      .eq-title {
        font-size: 22rpx;
        font-weight: 800;
        color: var(--text-primary);
      }

      .eq-desc {
        font-size: 20rpx;
        color: var(--text-secondary);
        line-height: 1.4;
      }
    }
  }
}

// 主题变体样式
.theme-praise {
  border-color: var(--accent);
  .feedback-msg { color: var(--accent); }
}

.theme-encourage {
  border-color: var(--accent-warn);
  .feedback-msg { color: var(--accent-warn); }
}

// 手记表单
.feedback-form-flat {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  border: 1rpx solid var(--border);

  .form-title {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 16rpx;

    .form-label {
      font-size: 22rpx;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .stars-row {
      display: flex;
      gap: 16rpx;

      .star-icon {
        font-size: 48rpx;
        color: var(--border);
        cursor: pointer;
        line-height: 1;
      }

      .star-active {
        color: var(--accent);
      }
    }

    .notes-textarea {
      width: 100%;
      height: 160rpx;
      background-color: var(--bg-primary);
      border: 1rpx solid var(--border);
      padding: 16rpx;
      font-size: 24rpx;
      color: var(--text-primary);
      box-sizing: border-box;
    }

    .char-count {
      font-size: 18rpx;
      color: var(--text-secondary);
      text-align: right;
      margin-top: -8rpx;
      font-family: var(--font-mono);
    }
  }

  .save-btn {
    background-color: var(--accent);
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 800;
    height: 90rpx;
    line-height: 90rpx;
    border-radius: var(--radius-sm, 4rpx);
    border: none;
    letter-spacing: 2rpx;
    text-transform: uppercase;
    margin-top: 16rpx;

    &:active {
      opacity: 0.9;
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
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;

  .modal-content {
    width: 80%;
    background-color: var(--bg-card);
    border: 2rpx solid var(--border);
    padding: 60rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    box-sizing: border-box;

    .ribbon {
      background-color: var(--accent);
      color: #ffffff;
      font-weight: 800;
      font-size: 26rpx;
      padding: 8rpx 32rpx;
      position: absolute;
      top: -26rpx;
      letter-spacing: 2rpx;
      text-transform: uppercase;
    }

    .congrats-text {
      font-size: 28rpx;
      font-weight: 800;
      color: var(--accent);
      margin-top: 24rpx;
    }

    .title-compare {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin: 28rpx 0;
      background-color: var(--bg-primary);
      border: 1rpx solid var(--border);
      padding: 12rpx 24rpx;

      .old-title {
        font-size: 22rpx;
        color: var(--text-secondary);
      }
      .arrow {
        color: var(--accent-warn);
        font-weight: bold;
      }
      .new-title {
        font-size: 24rpx;
        font-weight: 800;
        color: var(--accent);
      }
    }

    .level-desc {
      font-size: 20rpx;
      color: var(--text-secondary);
      margin-bottom: 40rpx;
      line-height: 1.5;
    }

    .modal-btn {
      width: 80%;
      background-color: var(--accent);
      color: #ffffff;
      font-weight: 800;
      font-size: 26rpx;
      height: 80rpx;
      line-height: 80rpx;
      border-radius: var(--radius-sm, 4rpx);
      border: none;
      letter-spacing: 2rpx;
      text-transform: uppercase;
    }
  }
}
</style>
