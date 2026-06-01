<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 生涯概览 (扁平总账板) -->
      <ThemeCard customClass="summary-board-flat">
        <view class="summary-header">生涯累计{{ themeStore.t('history') }}</view>
        <view class="summary-grid">
          <view class="summary-item">
            <NumberTicker 
              class="val" 
              :value="totalEarnings" 
              prefix="¥" 
              :precision="2" 
            />
            <text class="label">累计{{ themeStore.t('earnings') }}</text>
          </view>
          <view class="summary-item border-left">
            <NumberTicker 
              class="val" 
              :value="totalCount" 
              suffix="次" 
              :precision="0" 
            />
            <text class="label">累计{{ themeStore.t('todayCount') }}</text>
          </view>
          <view class="summary-item border-left">
            <text class="val">{{ formatHours(totalDuration) }}</text>
            <text class="label">累计{{ themeStore.t('poopDuration') }}</text>
          </view>
        </view>
      </ThemeCard>

      <!-- 筛选面板 -->
      <ThemeCard customClass="filter-panel-flat">
        <view class="filter-row">
          <picker mode="date" :value="startDateStr" @change="onStartDateChange">
            <view class="date-picker-btn">
              <text class="picker-label">START: </text>
              <text class="picker-value">{{ startDateStr || 'YYYY-MM-DD' }}</text>
            </view>
          </picker>
          <text class="filter-split">至</text>
          <picker mode="date" :value="endDateStr" @change="onEndDateChange">
            <view class="date-picker-btn">
              <text class="picker-label">END: </text>
              <text class="picker-value">{{ endDateStr || 'YYYY-MM-DD' }}</text>
            </view>
          </picker>
        </view>
        <view class="filter-actions">
          <button class="action-btn clear-btn" @tap="handleResetFilter">重置</button>
          <button class="action-btn search-btn" @tap="handleSearch">检索</button>
        </view>
      </ThemeCard>

      <!-- 记录列表 (平铺对账单) -->
      <view class="list-section" v-if="sessions.length > 0">
        <view 
          class="session-row-flat" 
          v-for="item in sessions" 
          :key="item._id"
        >
          <view class="row-header">
            <text class="poop-date">{{ formatDateTime(item.start_time) }}</text>
            <text class="poop-earnings">¥{{ item.earnings.toFixed(2) }}</text>
          </view>
          <view class="row-details">
            <view class="detail-row">
              <text class="detail-label">{{ themeStore.t('poopDuration') }}：</text>
              <text class="detail-val">{{ formatDurationSec(item.duration_seconds) }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">{{ themeStore.t('comfortLevel') }}：</text>
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
            <view class="note-box-flat" v-if="item.note">
              <text class="note-text">// {{ item.note }}</text>
            </view>
          </view>
        </view>

        <!-- 加载更多提示 -->
        <view class="load-more">
          <text class="load-text" v-if="loadingMore">加载中...</text>
          <text class="load-text" v-else>{{ hasMore ? '上拉加载更多...' : '— 已经全部加载完毕 —' }}</text>
        </view>
      </view>

      <!-- 空白状态 -->
      <view class="empty-state" v-else>
        <text class="empty-title">NO RECORD / 无记录</text>
        <text class="empty-desc">{{ emptyText }}</text>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { formatHours, formatDurationSec, formatDateTime } from '../../utils/formatters'
import type { PoopSession, StatsData } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()

const sessions = ref<PoopSession[]>([])
const page = ref(1)
const limit = 20
const hasMore = ref(true)
const loadingMore = ref(false)

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
onReachBottom(async () => {
  if (hasMore.value && !loadingMore.value) {
    loadingMore.value = true
    page.value += 1
    await loadSessions()
    loadingMore.value = false
  }
})

const emptyText = computed(() => {
  return themeStore.isStock
    ? '您还没有带薪交易流水，快点击首页的“开启交易”开盘吧！'
    : '您还没有实验反应日志，快点击首页的“启动实验”添加记录吧！'
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
</script>

<style lang="scss" scoped>
.page-container {
  padding: 32rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

// 头部扁平总账板
.summary-board-flat {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .summary-header {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
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
        font-size: 36rpx;
        font-weight: 800;
        font-family: var(--font-mono);
        color: var(--accent);
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
}

// 筛选面板
.filter-panel-flat {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .date-picker-btn {
      background-color: var(--bg-primary);
      border: 1rpx solid var(--border);
      padding: 16rpx 20rpx;
      font-size: 22rpx;
      color: var(--text-primary);
      display: flex;
      align-items: center;

      .picker-label {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: bold;
      }
      .picker-value {
        font-weight: bold;
        font-family: var(--font-mono);
      }
    }

    .filter-split {
      font-size: 22rpx;
      color: var(--text-secondary);
    }
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 20rpx;

    .action-btn {
      font-size: 22rpx;
      height: 56rpx;
      line-height: 56rpx;
      border-radius: var(--radius-sm, 4rpx);
      padding: 0 28rpx;
      border: none;
      font-weight: bold;
      letter-spacing: 1rpx;
      text-transform: uppercase;
    }

    .clear-btn {
      background-color: transparent;
      border: 1rpx solid var(--border);
      color: var(--text-secondary);

      &:active {
        background-color: var(--border);
        color: var(--text-primary);
      }
    }

    .search-btn {
      background-color: var(--accent);
      color: #ffffff;

      &:active {
        opacity: 0.9;
      }
    }
  }
}

// 列表区
.list-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.session-row-flat {
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .poop-date {
      font-size: 24rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .poop-earnings {
      font-size: 28rpx;
      font-weight: 800;
      color: var(--accent);
      font-family: var(--font-mono);
    }
  }

  .row-details {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .detail-row {
      display: flex;
      align-items: center;
      font-size: 22rpx;

      .detail-label {
        color: var(--text-secondary);
      }
      .detail-val {
        color: var(--text-primary);
        font-weight: 600;
      }

      .stars {
        display: flex;
        gap: 4rpx;
        color: var(--border);
        line-height: 1;

        .star {
          font-size: 20rpx;
        }
        .active {
          color: var(--accent);
        }
      }
    }
  }

  .note-box-flat {
    margin-top: 8rpx;
    padding: 12rpx 16rpx;
    border-left: 2rpx solid var(--border);
    background-color: rgba(255, 255, 255, 0.02);

    .note-text {
      font-size: 20rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }
}

.load-more {
  text-align: center;
  padding: 30rpx 0;

  .load-text {
    font-size: 20rpx;
    color: var(--text-secondary);
    letter-spacing: 1rpx;
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

  .empty-title {
    font-size: 26rpx;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 12rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .empty-desc {
    font-size: 22rpx;
    color: var(--text-secondary);
    max-width: 80%;
    line-height: 1.5;
  }
}
</style>
