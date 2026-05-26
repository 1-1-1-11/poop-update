<template>
  <view class="report-container">
    <!-- 周报选择器 -->
    <view class="picker-card" v-if="reports.length > 0">
      <view class="picker-label">查看周报历史：</view>
      <picker :range="weekOptions" :value="selectedReportIndex" @change="onReportChange">
        <view class="picker-value-box">
          <text class="val">{{ weekOptions[selectedReportIndex] }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 当前选定周报内容 -->
    <view class="report-card" v-if="activeReport">
      <view class="card-header">
        <text class="header-icon">📊</text>
        <view class="header-meta">
          <text class="title">带薪摸鱼周报</text>
          <text class="date-range">{{ formatDateRange(activeReport.week_start, activeReport.week_end) }}</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 核心汇总数据 -->
      <view class="metrics-grid">
        <view class="metric-item">
          <text class="lbl">带薪总收益</text>
          <text class="val salary-text">¥{{ activeReport.total_earnings.toFixed(2) }}</text>
        </view>
        <view class="metric-item">
          <text class="lbl">累计蹲厕时间</text>
          <text class="val">{{ formatMinutes(activeReport.total_duration_seconds) }}</text>
        </view>
        <view class="metric-item">
          <text class="lbl">如厕次数</text>
          <text class="val">{{ activeReport.total_sessions }} 次</text>
        </view>
        <view class="metric-item">
          <text class="lbl">平均舒适度</text>
          <text class="val">★{{ activeReport.avg_comfort.toFixed(1) }}</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 商品换算 -->
      <view class="comparisons-section" v-if="activeReport.purchasing_comparisons.length > 0">
        <view class="section-title">带薪采购力换算</view>
        <view class="comparisons-grid">
          <view 
            class="comparison-item" 
            v-for="(item, idx) in activeReport.purchasing_comparisons" 
            :key="idx"
          >
            <text class="comp-icon">{{ getComparisonIcon(item.icon) }}</text>
            <view class="comp-meta">
              <text class="comp-name">{{ item.item_name }}</text>
              <text class="comp-qty">可买 <text class="highlight">{{ item.quantity_affordable }}</text> 份</text>
            </view>
          </view>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 团队成就 -->
      <view class="team-rank-section" v-if="activeReport.rank_in_groups.length > 0">
        <view class="section-title">团队摸鱼争霸</view>
        <view class="team-rank-card" v-for="team in activeReport.rank_in_groups" :key="team.group_id">
          <text class="team-name">🛡️ {{ team.group_name }}</text>
          <text class="team-rank">本周排名：第 <text class="highlight">{{ team.rank }}</text> 名 / 共 {{ team.total_members }} 人</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 趣味评语 -->
      <view class="commentary-card">
        <text class="comm-title">🚽 摸鱼战神点评：</text>
        <text class="comm-text">{{ commentaryMessage }}</text>
      </view>
    </view>

    <!-- 暂无周报 -->
    <view class="empty-state" v-else>
      <text class="empty-emoji">📝</text>
      <text class="empty-title">暂无周报数据</text>
      <text class="empty-desc">每周一早上将自动生成您上一周的摸鱼周报。快去多拉几次粑粑积累数据吧！</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import type { WeeklyReport } from '../../utils/types'

const reports = ref<WeeklyReport[]>([])
const selectedReportIndex = ref(0)

onShow(async () => {
  await fetchReports()
})

const fetchReports = async () => {
  try {
    const res = await apiCall<{ reports: WeeklyReport[] }>('report-generator', 'getWeeklyReport')
    if (res.code === 0 && res.data?.reports) {
      reports.value = res.data.reports
      selectedReportIndex.value = 0
    }
  } catch (e) {
    console.error(e)
  }
}

// 格式化下拉菜单选项列表
const weekOptions = computed(() => {
  return reports.value.map(r => {
    const start = new Date(r.week_start)
    const end = new Date(r.week_end)
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()} 的周报`
  })
})

const activeReport = computed<WeeklyReport | null>(() => {
  if (reports.value.length === 0) return null
  return reports.value[selectedReportIndex.value]
})

const onReportChange = (e: any) => {
  selectedReportIndex.value = e.detail.value
}

// 趣味评语
const commentaryMessage = computed(() => {
  if (!activeReport.value) return ''
  const sessions = activeReport.value.total_sessions
  
  if (sessions >= 10) {
    return '本周拉屎极为频繁，简直是办公室排水系统的头号克星！老板看到此项数据，流下了感动的泪水，并默默扣紧了钱包。拉屎战神当之无愧！'
  } else if (sessions >= 5) {
    return '本周工作节奏健康，带薪拉屎张弛有度。把控时间极度精细，既让老板满脸笑容，也让自己兜里鼓鼓。堪称办公室高素质摸鱼楷模！'
  } else {
    return '本周拉屎次数偏少，是否工作太忙忘记了摸鱼？请注意多喝热水，工作再累，也不要忘记带薪排泄，不要让马桶圈空守孤寂！'
  }
})

const getComparisonIcon = (iconName: string): string => {
  const iconMap: { [k: string]: string } = {
    'coffee': '☕',
    'ice-cream': '🍦',
    'bubble-tea': '🥤',
    'pancake': '🥞',
    'takeout': '🥡',
    'movie': '🎬'
  }
  return iconMap[iconName] || '🎁'
}

const formatDateRange = (start: number, end: number): string => {
  const s = new Date(start)
  const e = new Date(end)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${s.getFullYear()}.${pad(s.getMonth() + 1)}.${pad(s.getDate())} - ${e.getFullYear()}.${pad(e.getMonth() + 1)}.${pad(e.getDate())}`
}

const formatMinutes = (seconds: number): string => {
  const m = Math.round(seconds / 60)
  return `${m}分钟`
}
</script>

<style lang="scss" scoped>
.report-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 选择卡
.picker-card {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .picker-label {
    font-size: 26rpx;
    color: $text-secondary;
    font-weight: bold;
  }

  .picker-value-box {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background-color: #fff9f5;
    border: 1rpx solid #ffd8c0;
    border-radius: $radius-sm;
    padding: 12rpx 24rpx;

    .val {
      font-size: 24rpx;
      font-weight: bold;
      color: $color-primary-dark;
    }

    .arrow {
      font-size: 18rpx;
      color: $text-hint;
    }
  }
}

// 周报正文卡
.report-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-md;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  gap: 28rpx;

  .card-header {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .header-icon {
      font-size: 56rpx;
    }

    .header-meta {
      display: flex;
      flex-direction: column;
      gap: 4rpx;

      .title {
        font-size: 32rpx;
        font-weight: bold;
        color: $text-primary;
      }
      .date-range {
        font-size: 20rpx;
        color: $text-hint;
      }
    }
  }

  .divider {
    height: 2rpx;
    background-color: #f5f5f5;
  }
}

// 汇总网格
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;

  .metric-item {
    background-color: #fffcf9;
    border: 1rpx solid #fff2e8;
    border-radius: $radius-md;
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .lbl {
      font-size: 20rpx;
      color: $text-hint;
      margin-bottom: 8rpx;
    }

    .val {
      font-size: 30rpx;
      font-weight: bold;
      color: $text-primary;
    }

    .salary-text {
      font-size: 40rpx;
      color: $color-primary;
      font-family: 'Courier New', Courier, monospace;
    }
  }
}

// 购买力
.comparisons-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .section-title {
    font-size: 26rpx;
    font-weight: bold;
    color: $text-secondary;
  }

  .comparisons-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;

    .comparison-item {
      display: flex;
      align-items: center;
      background-color: #fafafa;
      border-radius: $radius-sm;
      padding: 16rpx 20rpx;
      gap: 16rpx;
      border: 1rpx solid #eeeeee;

      .comp-icon {
        font-size: 44rpx;
      }

      .comp-meta {
        display: flex;
        flex-direction: column;

        .comp-name {
          font-size: 24rpx;
          color: $text-primary;
          font-weight: bold;
        }

        .comp-qty {
          font-size: 20rpx;
          color: $text-hint;

          .highlight {
            color: $color-primary-dark;
            font-weight: bold;
          }
        }
      }
    }
  }
}

// 团队争霸
.team-rank-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  .section-title {
    font-size: 26rpx;
    font-weight: bold;
    color: $text-secondary;
  }

  .team-rank-card {
    background-color: #f5f9ff;
    border: 1rpx solid #d0e3ff;
    border-radius: $radius-sm;
    padding: 20rpx 24rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .team-name {
      font-size: 24rpx;
      font-weight: bold;
      color: #1a56cc;
    }

    .team-rank {
      font-size: 22rpx;
      color: $text-secondary;

      .highlight {
        color: #1a56cc;
        font-weight: bold;
        font-size: 26rpx;
      }
    }
  }
}

// 评语卡
.commentary-card {
  background-color: #fff9f0;
  border: 1rpx solid #ffe8cc;
  border-radius: $radius-md;
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .comm-title {
    font-size: 24rpx;
    font-weight: bold;
    color: $color-primary-dark;
  }

  .comm-text {
    font-size: 22rpx;
    color: $text-secondary;
    line-height: 1.4;
    font-style: italic;
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
