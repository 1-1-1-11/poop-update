<template>
  <view class="history-container">
    <!-- 生涯概览卡片 -->
    <view class="summary-card">
      <view class="summary-header">生涯累计摸鱼战绩</view>
      <view class="summary-grid">
        <view class="summary-item">
          <text class="val">¥{{ totalEarnings.toFixed(2) }}</text>
          <text class="label">累计赚取</text>
        </view>
        <view class="summary-item border-left">
          <text class="val">{{ totalCount }}次</text>
          <text class="label">如厕次数</text>
        </view>
        <view class="summary-item border-left">
          <text class="val">{{ formatHours(totalDuration) }}</text>
          <text class="label">累计时长</text>
        </view>
      </view>
    </view>

    <!-- 筛选面板 -->
    <view class="filter-panel">
      <view class="filter-row">
        <picker mode="date" :value="startDateStr" @change="onStartDateChange">
          <view class="date-picker-btn">
            <text class="picker-label">开始：</text>
            <text class="picker-value">{{ startDateStr || '请选择' }}</text>
          </view>
        </picker>
        <text class="filter-split">至</text>
        <picker mode="date" :value="endDateStr" @change="onEndDateChange">
          <view class="date-picker-btn">
            <text class="picker-label">结束：</text>
            <text class="picker-value">{{ endDateStr || '请选择' }}</text>
          </view>
        </picker>
      </view>
      <view class="filter-actions">
        <button class="action-btn clear-btn" @tap="handleResetFilter">重置</button>
        <button class="action-btn search-btn" @tap="handleSearch">搜索</button>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="list-section" v-if="sessions.length > 0">
      <view 
        class="session-card" 
        v-for="item in sessions" 
        :key="item._id"
      >
        <view class="card-header">
          <text class="poop-date">{{ formatDateTime(item.start_time) }}</text>
          <text class="poop-earnings">¥{{ item.earnings.toFixed(2) }}</text>
        </view>
        <view class="card-details">
          <view class="detail-row">
            <text class="detail-label">🕒 蹲厕时长：</text>
            <text class="detail-val">{{ formatDurationSec(item.duration_seconds) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">⭐ 舒适程度：</text>
            <view class="stars">
              <text 
                v-for="star in 5" 
                :key="star" 
                class="star" 
                :class="{ active: star <= item.comfort_level }"
              >
                ★
              </text>
            </view>
          </view>
          <view class="note-box" v-if="item.note">
            <text class="note-quote">“</text>
            <text class="note-text">{{ item.note }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view class="load-more">
        <text class="load-text">{{ hasMore ? '上拉加载更多...' : '— 已经拉到底了 —' }}</text>
      </view>
    </view>

    <!-- 空白状态 -->
    <view class="empty-state" v-else>
      <text class="empty-emoji">🧻</text>
      <text class="empty-title">暂无记录</text>
      <text class="empty-desc">您还没有带薪拉屎的记录，快点击“开始拉屎”吧！</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { useUserStore } from '../../stores/user'
import type { PoopSession, StatsData } from '../../utils/types'

const userStore = useUserStore()

const sessions = ref<PoopSession[]>([])
const page = ref(1)
const limit = 20
const hasMore = ref(true)

// 生涯累计
const totalEarnings = ref(0)
const totalCount = ref(0)
const totalDuration = ref(0)

// 筛选字段
const startDateStr = ref('')
const endDateStr = ref('')
const searchStartDate = ref<number | undefined>(undefined)
const searchEndDate = ref<number | undefined>(undefined)

onShow(async () => {
  // 加载生涯累积属性
  await fetchLifetimeStats()
  // 加载列表第一页
  await handleResetFilter()
})

const fetchLifetimeStats = async () => {
  try {
    const res = await apiCall<StatsData>('session-manager', 'stats', { period: 'all' })
    if (res.code === 0 && res.data) {
      totalEarnings.value = res.data.total_earnings
      totalCount.value = res.data.total_sessions
      totalDuration.value = res.data.total_duration_seconds
    }
  } catch (e) {
    console.error(e)
  }
}

const loadSessions = async (isNew = false) => {
  if (isNew) {
    page.value = 1
    sessions.value = []
    hasMore.value = true
  }

  try {
    const res = await apiCall<{ sessions: PoopSession[]; has_more: boolean }>('session-manager', 'list', {
      page: page.value,
      limit,
      date_start: searchStartDate.value,
      date_end: searchEndDate.value
    })

    if (res.code === 0 && res.data) {
      sessions.value = [...sessions.value, ...res.data.sessions]
      hasMore.value = res.data.has_more
    }
  } catch (e) {
    console.error(e)
  }
}

// 触底加载下一页
onReachBottom(() => {
  if (hasMore.value) {
    page.value += 1
    loadSessions()
  }
})

const onStartDateChange = (e: any) => {
  startDateStr.value = e.detail.value
  searchStartDate.value = new Date(e.detail.value + 'T00:00:00').getTime()
}

const onEndDateChange = (e: any) => {
  endDateStr.value = e.detail.value
  searchEndDate.value = new Date(e.detail.value + 'T23:59:59').getTime()
}

const handleSearch = () => {
  loadSessions(true)
}

const handleResetFilter = async () => {
  startDateStr.value = ''
  endDateStr.value = ''
  searchStartDate.value = undefined
  searchEndDate.value = undefined
  await loadSessions(true)
}

const formatHours = (seconds: number): string => {
  const hrs = (seconds / 3600).toFixed(1)
  return `${hrs}小时`
}

const formatDurationSec = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

const formatDateTime = (timestamp: number): string => {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hr = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hr}:${min}`
}
</script>

<style lang="scss" scoped>
.history-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 头部汇总
.summary-card {
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-lg;
  padding: 36rpx;
  box-shadow: $shadow-md;
  color: #ffffff;

  .summary-header {
    font-size: 26rpx;
    font-weight: bold;
    opacity: 0.8;
    margin-bottom: 24rpx;
  }

  .summary-grid {
    display: flex;
    justify-content: space-around;
    text-align: center;

    .summary-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .val {
        font-size: 40rpx;
        font-weight: 800;
        font-family: 'Courier New', Courier, monospace;
      }

      .label {
        font-size: 22rpx;
        opacity: 0.8;
      }
    }

    .border-left {
      border-left: 2rpx solid rgba(255, 255, 255, 0.2);
    }
  }
}

// 筛选面板
.filter-panel {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .date-picker-btn {
      background-color: #fff9f5;
      border: 1rpx solid #ffd8c0;
      border-radius: $radius-sm;
      padding: 16rpx 20rpx;
      font-size: 24rpx;
      color: $text-primary;
      display: flex;
      align-items: center;

      .picker-label {
        color: $text-secondary;
      }
      .picker-value {
        font-weight: bold;
      }
    }

    .filter-split {
      font-size: 24rpx;
      color: $text-hint;
    }
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 20rpx;

    .action-btn {
      font-size: 24rpx;
      height: 60rpx;
      line-height: 60rpx;
      border-radius: $radius-round;
      padding: 0 32rpx;
      border: none;
    }

    .clear-btn {
      background-color: #f5f5f5;
      color: $text-secondary;
    }

    .search-btn {
      background-color: $color-primary;
      color: #ffffff;
      font-weight: bold;
    }
  }
}

// 记录卡片
.session-card {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .poop-date {
      font-size: 26rpx;
      color: $text-secondary;
      font-weight: bold;
    }

    .poop-earnings {
      font-size: 34rpx;
      font-weight: bold;
      color: $color-primary-dark;
      font-family: 'Courier New', Courier, monospace;
    }
  }

  .card-details {
    display: flex;
    flex-direction: column;
    gap: 12rpx;

    .detail-row {
      display: flex;
      align-items: center;
      font-size: 24rpx;

      .detail-label {
        color: $text-hint;
      }
      .detail-val {
        color: $text-primary;
        font-weight: 500;
      }

      .stars {
        display: flex;
        gap: 4rpx;
        color: #e0e0e0;
        line-height: 1;

        .star {
          font-size: 28rpx;
        }
        .active {
          color: #ffc107;
        }
      }
    }
  }

  .note-box {
    margin-top: 12rpx;
    background-color: #fffaf5;
    border-radius: $radius-sm;
    padding: 16rpx 20rpx;
    display: flex;
    gap: 8rpx;
    border: 1rpx solid #fff0e2;

    .note-quote {
      font-size: 36rpx;
      color: $color-primary-light;
      line-height: 1;
      font-weight: bold;
    }

    .note-text {
      font-size: 24rpx;
      color: $text-secondary;
      line-height: 1.4;
      font-style: italic;
    }
  }
}

.load-more {
  text-align: center;
  padding: 20rpx 0;

  .load-text {
    font-size: 22rpx;
    color: $text-hint;
  }
}

// 空白状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  text-align: center;

  .empty-emoji {
    font-size: 140rpx;
    margin-bottom: 24rpx;
    opacity: 0.8;
  }

  .empty-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 12rpx;
  }

  .empty-desc {
    font-size: 24rpx;
    color: $text-hint;
    max-width: 80%;
  }
}
</style>
