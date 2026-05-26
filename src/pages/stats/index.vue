<template>
  <view class="stats-container">
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

    <!-- 汇总统计卡片 -->
    <view class="summary-section">
      <view class="sum-card big-card">
        <text class="sum-label">摸鱼总收益</text>
        <text class="sum-val salary-text">¥{{ statsData?.total_earnings.toFixed(2) || '0.00' }}</text>
      </view>
      <view class="half-cards-row">
        <view class="sum-card">
          <text class="sum-label">如厕频次</text>
          <text class="sum-val">{{ statsData?.total_sessions || 0 }}次</text>
        </view>
        <view class="sum-card">
          <text class="sum-label">拉屎总时长</text>
          <text class="sum-val">{{ formatHours(statsData?.total_duration_seconds || 0) }}</text>
        </view>
      </view>
      <view class="half-cards-row">
        <view class="sum-card">
          <text class="sum-label">平均时长</text>
          <text class="sum-val">{{ formatMinutes(statsData?.avg_duration_seconds || 0) }}</text>
        </view>
        <view class="sum-card">
          <text class="sum-label">平均舒适度</text>
          <text class="sum-val">★{{ statsData?.avg_comfort || '0.0' }}</text>
        </view>
      </view>
    </view>

    <!-- 24小时分布直方图 -->
    <view class="chart-card">
      <view class="chart-header">24小时如厕分布</view>
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
      <text class="chart-desc">反映您在哪个工作时间段拉屎最频繁。</text>
    </view>

    <!-- 舒适度趋势折线图 (Canvas 渲染, 兼容小程序) -->
    <view class="chart-card" v-if="statsData?.comfort_trend?.length">
      <view class="chart-header">肠胃状态趋势 (舒适度)</view>
      <canvas canvas-id="comfortChart" class="trend-canvas"></canvas>
      <view class="trend-labels">
        <text class="start-date">{{ comfortStartDate }}</text>
        <text class="trend-title-label">舒适度变化 (1-5星)</text>
        <text class="end-date">{{ comfortEndDate }}</text>
      </view>
    </view>

    <!-- 日历热力图 (本月) -->
    <view class="chart-card">
      <view class="chart-header">本月如厕足迹 (打卡热力图)</view>
      <view class="calendar-grid">
        <view class="weekday-header" v-for="wd in weekdays" :key="wd">{{ wd }}</view>
        <!-- 空白格填充 -->
        <view class="day-cell empty" v-for="empty in calendarPadding" :key="'empty-'+empty"></view>
        <!-- 日历天 -->
        <view 
          class="day-cell" 
          v-for="day in calendarDays" 
          :key="'day-'+day.date"
          :class="getHeatmapClass(day.count)"
          @tap="showDayStats(day)"
        >
          <text class="day-num">{{ day.dayNum }}</text>
          <text class="day-count-tag" v-if="day.count > 0">{{ day.count }}</text>
        </view>
      </view>
      <view class="heatmap-legend">
        <text class="legend-lbl">少</text>
        <view class="legend-box heat-0"></view>
        <view class="legend-box heat-1"></view>
        <view class="legend-box heat-2"></view>
        <view class="legend-box heat-3"></view>
        <text class="legend-lbl">多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { formatHours, formatMinutes } from '../../utils/formatters'
import type { StatsData } from '../../utils/types'

const activePeriod = ref<'week' | 'month' | 'year' | 'all'>('week')
const statsData = ref<StatsData | null>(null)

// 24小时分布数组
const hourlyDistribution = ref<number[]>(new Array(24).fill(0))

// 日历热力图字段
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

// 柱状图高度计算比例
const getBarHeightPercent = (count: number): number => {
  const max = Math.max(...hourlyDistribution.value)
  if (max === 0) return 0
  return (count / max) * 100
}

// Canvas 折线图绘制
const drawComfortChart = () => {
  const trend = statsData.value?.comfort_trend
  if (!trend || trend.length === 0) return

  const canvasWidth = 320
  const canvasHeight = 120
  const padding = { top: 10, bottom: 10, left: 10, right: 10 }
  const chartW = canvasWidth - padding.left - padding.right
  const chartH = canvasHeight - padding.top - padding.bottom

  const ctx = uni.createCanvasContext('comfortChart')
  if (!ctx) return

  const points = trend.map((t, idx) => {
    const x = trend.length > 1
      ? padding.left + idx * (chartW / (trend.length - 1))
      : canvasWidth / 2
    const y = padding.top + chartH - ((t.avg_comfort - 1) / 4) * chartH
    return { x, y }
  })

  // 水平参考线
  ctx.setStrokeStyle('#f0f0f0')
  ctx.setLineWidth(1)
  ctx.setLineDash([3, 3], 0)
  for (let i = 1; i <= 3; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(canvasWidth - padding.right, y)
    ctx.stroke()
  }
  ctx.setLineDash([], 0)

  // 折线
  if (points.length > 1) {
    ctx.setStrokeStyle('#FF8C42')
    ctx.setLineWidth(3)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
  }

  // 数据点
  points.forEach(pt => {
    ctx.setFillStyle('#ffffff')
    ctx.setStrokeStyle('#FF8C42')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  ctx.draw()
}

const comfortStartDate = computed(() => {
  const trend = statsData.value?.comfort_trend || []
  if (trend.length === 0) return ''
  return trend[0].date.substring(5) // MM-DD
})

const comfortEndDate = computed(() => {
  const trend = statsData.value?.comfort_trend || []
  if (trend.length <= 1) return ''
  return trend[trend.length - 1].date.substring(5)
})

// 生成当前月的热力图日历
const loadCalendarHeatmap = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 1. 获取当月第一天星期几
  const firstDay = new Date(year, month - 1, 1)
  let firstDayOfWeek = firstDay.getDay() // 0-6 (0=周日)
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // 转化：0=周一，6=周日
  calendarPadding.value = firstDayOfWeek

  // 2. 获取当月总天数
  const totalDays = new Date(year, month, 0).getDate()

  // 3. 调用 API 获取本月每日数据
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

// 舒适热力等级
const getHeatmapClass = (count: number): string => {
  if (count === 0) return 'heat-0'
  if (count === 1) return 'heat-1'
  if (count === 2) return 'heat-2'
  return 'heat-3'
}

const showDayStats = (day: any) => {
  if (day.count > 0) {
    uni.showToast({
      title: `${day.date} 带薪如厕 ${day.count} 次`,
      icon: 'none'
    })
  }
}

// 数据变化后绘制折线图
watch(statsData, () => {
  nextTick(() => drawComfortChart())
})

</script>

<style lang="scss" scoped>
.stats-container {
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

// 汇总统计卡片
.summary-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .sum-card {
    background-color: $bg-card;
    border: 1rpx solid #ffe8d8;
    border-radius: $radius-md;
    padding: 24rpx 32rpx;
    display: flex;
    flex-direction: column;
    box-shadow: $shadow-sm;

    .sum-label {
      font-size: 22rpx;
      color: $text-hint;
    }

    .sum-val {
      font-size: 36rpx;
      font-weight: 800;
      color: $text-primary;
      margin-top: 4rpx;
    }

    .salary-text {
      font-size: 52rpx;
      color: $color-primary;
      font-family: 'Courier New', Courier, monospace;
    }
  }

  .big-card {
    padding: 32rpx 40rpx;
  }

  .half-cards-row {
    display: flex;
    gap: 16rpx;

    .sum-card {
      flex: 1;
    }
  }
}

// 图表卡片通用
.chart-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;

  .chart-header {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
    margin-bottom: 32rpx;
  }

  .chart-desc {
    font-size: 20rpx;
    color: $text-hint;
    text-align: center;
    margin-top: 16rpx;
  }
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
      background-color: #f7f7f7;
      border-radius: $radius-round;
      display: flex;
      align-items: flex-end;

      .bar-fill {
        width: 100%;
        background: linear-gradient(180deg, $color-primary-light 0%, $color-primary 100%);
        border-radius: $radius-round;
        position: relative;
        transition: height 0.5s ease;

        .bar-count-tip {
          position: absolute;
          top: -24rpx;
          left: 50%;
          transform: translateX(-50%);
          font-size: 16rpx;
          color: $color-primary-dark;
          font-weight: bold;
        }
      }
    }

    .bar-label {
      font-size: 16rpx;
      color: $text-hint;
      margin-top: 8rpx;
    }
  }
}

// Canvas 折线图
.trend-canvas {
  width: 100%;
  height: 150rpx;
  margin-top: 10rpx;
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20rpx;
  color: $text-hint;
  margin-top: 12rpx;

  .trend-title-label {
    color: $text-secondary;
    font-weight: bold;
  }
}

// 日历热力图
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10rpx;
  margin-top: 10rpx;

  .weekday-header {
    text-align: center;
    font-size: 22rpx;
    color: $text-hint;
    padding-bottom: 8rpx;
    font-weight: bold;
  }

  .day-cell {
    aspect-ratio: 1;
    border-radius: $radius-sm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;

    .day-num {
      font-size: 24rpx;
      font-weight: bold;
      color: $text-primary;
    }

    .day-count-tag {
      position: absolute;
      top: 2rpx;
      right: 4rpx;
      font-size: 14rpx;
      background-color: rgba(255, 255, 255, 0.7);
      border-radius: 999rpx;
      width: 22rpx;
      height: 22rpx;
      display: flex;
      justify-content: center;
      align-items: center;
      color: $color-primary-dark;
      font-weight: 800;
    }
  }

  .empty {
    background-color: transparent;
  }

  // 热度填充色
  .heat-0 {
    background-color: #f7f7f7;
    .day-num { color: #bbbbbb; }
  }
  .heat-1 {
    background-color: #ffeae0;
    border: 1rpx solid #ffd8c0;
    .day-num { color: $color-primary-dark; }
  }
  .heat-2 {
    background-color: #ffccb0;
    border: 1rpx solid #ffa070;
    .day-num { color: $color-primary-dark; }
  }
  .heat-3 {
    background-color: $color-primary;
    border: 1rpx solid $color-primary-dark;
    .day-num { color: #ffffff; }
  }
}

.heatmap-legend {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;

  .legend-lbl {
    font-size: 20rpx;
    color: $text-hint;
  }

  .legend-box {
    width: 20rpx;
    height: 20rpx;
    border-radius: 4rpx;
  }
  
  .heat-0 { background-color: #f7f7f7; }
  .heat-1 { background-color: #ffeae0; }
  .heat-2 { background-color: #ffccb0; }
  .heat-3 { background-color: $color-primary; }
}
</style>
