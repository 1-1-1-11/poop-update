<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 顶部时间段选项卡 -->
      <view class="tabs-row">
        <view 
          class="tab-item" 
          :class="{ active: activePeriod === 'week' }"
          @tap="switchPeriod('week')"
        >
          本周
        </view>
        <view 
          class="tab-item" 
          :class="{ active: activePeriod === 'month' }"
          @tap="switchPeriod('month')"
        >
          本月
        </view>
        <view 
          class="tab-item" 
          :class="{ active: activePeriod === 'year' }"
          @tap="switchPeriod('year')"
        >
          今年
        </view>
        <view 
          class="tab-item" 
          :class="{ active: activePeriod === 'all' }"
          @tap="switchPeriod('all')"
        >
          累计
        </view>
      </view>

      <!-- 汇总账目板 (高密度三栏式 Ledger) -->
      <ThemeCard customClass="ledger-board">
        <view class="ledger-top-row">
          <text class="lbl">累计已赚{{ themeStore.t('earnings') }}</text>
          <NumberTicker 
            class="val-large font-mono" 
            :value="statsData?.total_earnings || 0" 
            prefix="¥" 
            :precision="2" 
          />
        </view>
        
        <view class="ledger-divider-line"></view>

        <view class="ledger-grid">
          <view class="ledger-column">
            <text class="sub-lbl">累计{{ themeStore.t('todayCount') }}</text>
            <NumberTicker 
              class="sub-val font-mono" 
              :value="statsData?.total_sessions || 0" 
              suffix="次" 
              :precision="0" 
            />
          </view>
          
          <view class="vertical-line"></view>

          <view class="ledger-column">
            <text class="sub-lbl">累计{{ themeStore.t('poopDuration') }}</text>
            <text class="sub-val">{{ formatHours(statsData?.total_duration_seconds || 0) }}</text>
          </view>

          <view class="vertical-line"></view>

          <view class="ledger-column">
            <text class="sub-lbl">平均{{ themeStore.t('comfortLevel') }}</text>
            <text class="sub-val font-mono">★{{ statsData?.avg_comfort?.toFixed(1) || '0.0' }}</text>
          </view>
        </view>
      </ThemeCard>

      <!-- 24小时分布直方图 -->
      <view class="chart-section-flat">
        <view class="chart-header-flat">24小时{{ themeStore.t('todayCount') }}分布</view>
        <scroll-view class="hourly-bar-scroll" scroll-x="true" show-scrollbar="false">
          <view class="hourly-bar-chart">
            <view 
              class="bar-column" 
              v-for="(count, hour) in hourlyDistribution" 
              :key="hour"
            >
              <view class="bar-container">
                <view 
                  class="bar-fill" 
                  :style="{ height: getBarHeightPercent(count) + '%' }"
                >
                  <text class="bar-count-tip" v-if="count > 0">{{ count }}</text>
                </view>
              </view>
              <text class="bar-label">{{ String(hour).padStart(2, '0') }}</text>
            </view>
          </view>
        </scroll-view>
        <text class="chart-desc-flat">{{ distributionDesc }}</text>
      </view>

      <view class="section-divider"></view>

      <!-- 趋势折线图 -->
      <view class="chart-section-flat" v-if="chartData.length > 0">
        <view class="chart-header-flat">{{ themeStore.t('statsTitle') }}</view>
        <view class="canvas-wrapper-flat">
          <DataChart canvasId="comfortChart" type="line" :data="chartData" />
        </view>
        <view class="trend-labels">
          <text class="start-date">{{ comfortStartDate }}</text>
          <text class="trend-title-label">{{ trendLabel }}</text>
          <text class="end-date">{{ comfortEndDate }}</text>
        </view>
      </view>

      <view class="section-divider" v-if="chartData.length > 0"></view>

      <!-- 日历热力图 (本月 Github Contribution 点阵风) -->
      <view class="chart-section-flat">
        <view class="chart-header-flat">{{ calendarHeader }}</view>
        
        <view class="heatmap-container-flat">
          <view class="calendar-grid-flat">
            <view class="weekday-header" v-for="wd in weekdays" :key="wd">{{ wd }}</view>
            <!-- 空白格填充 -->
            <view class="day-dot empty" v-for="empty in calendarPadding" :key="'empty-'+empty"></view>
            <!-- 点阵单元 -->
            <view 
              class="day-dot" 
              v-for="day in calendarDays" 
              :key="'day-'+day.date"
              :class="getHeatmapClass(day.count)"
              @tap="showDayStats(day)"
            >
              <text class="dot-num-lbl">{{ day.dayNum }}</text>
            </view>
          </view>
        </view>

        <view class="heatmap-legend-flat">
          <text class="legend-lbl">少</text>
          <view class="legend-dot heat-0"></view>
          <view class="legend-dot heat-1"></view>
          <view class="legend-dot heat-2"></view>
          <view class="legend-dot heat-3"></view>
          <text class="legend-lbl">多</text>
        </view>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { useThemeStore } from '../../stores/theme'
import { formatHours, formatMinutes } from '../../utils/formatters'
import type { StatsData } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'
import DataChart from '../../components/DataChart.vue'

const themeStore = useThemeStore()
const activePeriod = ref<'week' | 'month' | 'year' | 'all'>('week')
const statsData = ref<StatsData | null>(null)

const hourlyDistribution = ref<number[]>(new Array(24).fill(0))

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const calendarPadding = ref(0)
const calendarDays = ref<any[]>([])

onShow(async () => {
  await loadStats()
  await loadCalendarHeatmap()
})

const switchPeriod = async (period: 'week' | 'month' | 'year' | 'all') => {
  activePeriod.value = period
  await loadStats()
}

const loadStats = async () => {
  try {
    const res = await apiCall<StatsData>('session-manager', 'stats', { period: activePeriod.value })
    if (res.code === 0 && res.data) {
      statsData.value = res.data
      hourlyDistribution.value = res.data.hourly_distribution || new Array(24).fill(0)
    }
  } catch (e) {
    console.error(e)
  }
}

const chartData = computed(() => {
  const trend = statsData.value?.comfort_trend || []
  return trend.map(t => ({
    label: t.date.substring(5),
    value: t.avg_comfort
  }))
})

const getBarHeightPercent = (count: number): number => {
  const max = Math.max(...hourlyDistribution.value)
  if (max === 0) return 0
  return (count / max) * 100
}

const comfortStartDate = computed(() => {
  const trend = statsData.value?.comfort_trend || []
  if (trend.length === 0) return ''
  return trend[0].date.substring(5)
})

const comfortEndDate = computed(() => {
  const trend = statsData.value?.comfort_trend || []
  if (trend.length <= 1) return ''
  return trend[trend.length - 1].date.substring(5)
})

const distributionDesc = computed(() => {
  return themeStore.isStock
    ? '反映您在哪个股票开盘交易时间段最为活跃。'
    : '反映您在哪个科学观察时间段的样本计数最多。'
})

const trendLabel = computed(() => {
  return themeStore.isStock
    ? '操作满意度走势'
    : '实验平均纯净度变化'
})

const calendarHeader = computed(() => {
  return themeStore.isStock
    ? '本月交易足迹 (点阵对账)'
    : '本月实验足迹 (点阵记录)'
})

const loadCalendarHeatmap = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const firstDay = new Date(year, month - 1, 1)
  let firstDayOfWeek = firstDay.getDay()
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  calendarPadding.value = firstDayOfWeek

  const totalDays = new Date(year, month, 0).getDate()

  try {
    const res = await apiCall<{ days: any[] }>('session-manager', 'dailyStats', { year, month })
    const dailyStats = res.code === 0 ? res.data?.days || [] : []
    const dailyMap: { [dateStr: string]: number } = {}
    dailyStats.forEach(d => {
      dailyMap[d.date] = d.count
    })

    const daysArr: any[] = []
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      daysArr.push({
        dayNum: day,
        date: dateStr,
        count: dailyMap[dateStr] || 0
      })
    }
    calendarDays.value = daysArr
  } catch (e) {
    console.error(e)
  }
}

const getHeatmapClass = (count: number): string => {
  if (count === 0) return 'heat-0'
  if (count === 1) return 'heat-1'
  if (count === 2) return 'heat-2'
  return 'heat-3'
}

const showDayStats = (day: any) => {
  if (day.count > 0) {
    const label = themeStore.isStock ? '交易' : '实验'
    uni.showToast({
      title: `${day.date} 带薪${label} ${day.count} 次`,
      icon: 'none'
    })
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

// Dot Map variables
.theme-stock {
  --dot-bg: #161B22;
  --dot-1: rgba(0, 230, 118, 0.2);
  --dot-2: rgba(0, 230, 118, 0.6);
  --dot-3: #00E676;
}

.theme-lab {
  --dot-bg: #F3F4F6;
  --dot-1: rgba(37, 99, 235, 0.15);
  --dot-2: rgba(37, 99, 235, 0.5);
  --dot-3: #2563EB;
}

// 选项卡
.tabs-row {
  display: flex;
  background-color: var(--border);
  border-radius: var(--radius-round);
  padding: 8rpx;
  width: 100%;
  box-sizing: border-box;

  .tab-item {
    flex: 1;
    text-align: center;
    font-size: 26rpx;
    font-weight: bold;
    color: var(--text-secondary);
    padding: 16rpx 0;
    border-radius: var(--radius-round);
    transition: all 0.3s ease;

    &.active {
      background-color: var(--accent);
      color: #ffffff;
    }
  }
}

// 三栏对账单
.ledger-board {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .ledger-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .lbl {
      font-size: 22rpx;
      color: var(--text-secondary);
      font-weight: bold;
    }

    .val-large {
      font-size: 48rpx;
      font-weight: 800;
      color: var(--accent);
    }
  }

  .ledger-divider-line {
    height: 1rpx;
    background-color: var(--border);
    width: 100%;
  }

  .ledger-grid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .ledger-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;

    .sub-lbl {
      font-size: 18rpx;
      color: var(--text-secondary);
    }

    .sub-val {
      font-size: 28rpx;
      font-weight: bold;
      color: var(--text-primary);
    }
  }

  .vertical-line {
    width: 2rpx;
    height: 48rpx;
    background-color: var(--border);
  }
}

// 扁平图表区块
.chart-section-flat {
  display: flex;
  flex-direction: column;
  width: 100%;

  .chart-header-flat {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    border-left: 6rpx solid var(--accent);
    padding-left: 16rpx;
    line-height: 1;
    margin-bottom: 24rpx;
    text-transform: uppercase;
    letter-spacing: 2rpx;
  }

  .canvas-wrapper-flat {
    width: 100%;
    box-sizing: border-box;
  }

  .chart-desc-flat {
    font-size: 18rpx;
    color: var(--text-secondary);
    text-align: center;
    margin-top: 12rpx;
  }
}

.section-divider {
  height: 2rpx;
  background-color: var(--border);
  width: 100%;
}

// 24h直方图
.hourly-bar-scroll {
  width: 100%;
  white-space: nowrap;
}

.hourly-bar-chart {
  display: inline-flex;
  align-items: flex-end;
  height: 220rpx;
  padding: 20rpx 0;
  gap: 12rpx;

  .bar-column {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: 32rpx;

    .bar-container {
      height: 150rpx;
      width: 16rpx;
      background-color: var(--border);
      border-radius: var(--radius-round);
      display: flex;
      align-items: flex-end;

      .bar-fill {
        width: 100%;
        background: linear-gradient(180deg, var(--accent-info) 0%, var(--accent) 100%);
        border-radius: var(--radius-round);
        position: relative;
        transition: height 0.5s ease;

        .bar-count-tip {
          position: absolute;
          top: -24rpx;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16rpx;
          color: var(--accent);
          font-weight: bold;
        }
      }
    }

    .bar-label {
      font-size: 16rpx;
      color: var(--text-secondary);
      margin-top: 8rpx;
    }
  }
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20rpx;
  color: var(--text-secondary);
  margin-top: 12rpx;

  .trend-title-label {
    font-weight: bold;
  }
}

// 点阵日历热力图
.heatmap-container-flat {
  width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
}

.calendar-grid-flat {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
  width: 100%;
  box-sizing: border-box;

  .weekday-header {
    text-align: center;
    font-size: 20rpx;
    color: var(--text-secondary);
    padding-bottom: 8rpx;
    font-weight: bold;
  }

  .day-dot {
    aspect-ratio: 1;
    border-radius: 4rpx; // strict geometric dot
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    border: none;
    box-shadow: none;

    .dot-num-lbl {
      font-size: 16rpx;
      color: transparent; // hide numbers inside dot map for clean github look
    }

    &:hover .dot-num-lbl {
      color: inherit;
    }
  }

  .empty {
    background-color: transparent !important;
  }

  .heat-0 { background-color: var(--dot-bg); }
  .heat-1 { background-color: var(--dot-1); }
  .heat-2 { background-color: var(--dot-2); }
  .heat-3 { background-color: var(--dot-3); }
}

.heatmap-legend-flat {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;

  .legend-lbl {
    font-size: 18rpx;
    color: var(--text-secondary);
  }

  .legend-dot {
    width: 24rpx;
    height: 24rpx;
    border-radius: 4rpx;
  }
  
  .heat-0 { background-color: var(--dot-bg); }
  .heat-1 { background-color: var(--dot-1); }
  .heat-2 { background-color: var(--dot-2); }
  .heat-3 { background-color: var(--dot-3); }
}
</style>
