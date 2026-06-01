<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 周报选择器 (扁平下拉) -->
      <ThemeCard customClass="picker-card-flat" v-if="reports.length > 0">
        <view class="picker-label">历史账单流水：</view>
        <picker :range="weekOptions" :value="selectedReportIndex" @change="onReportChange">
          <view class="picker-value-box">
            <text class="val">{{ weekOptions[selectedReportIndex] }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </ThemeCard>

      <!-- 当前选定周报内容 (扁平版面) -->
      <view class="report-layout-flat" v-if="activeReport">
        <view class="report-header">
          <view class="header-meta">
            <text class="title">{{ reportTitle }}</text>
            <text class="date-range">{{ formatDateRange(activeReport.week_start, activeReport.week_end) }}</text>
          </view>
        </view>

        <!-- 核心汇总数据 -->
        <view class="metrics-grid-flat">
          <view class="metric-item-flat">
            <text class="lbl">累计{{ themeStore.t('earnings') }}</text>
            <view class="val salary-text">
              <NumberTicker :value="activeReport.total_earnings" prefix="¥" :precision="2" />
            </view>
          </view>
          <view class="metric-item-flat">
            <text class="lbl">累计{{ themeStore.t('poopDuration') }}</text>
            <text class="val">{{ formatMinutes(activeReport.total_duration_seconds) }}</text>
          </view>
          <view class="metric-item-flat">
            <text class="lbl">累计{{ themeStore.t('todayCount') }}</text>
            <view class="val">
              <NumberTicker :value="activeReport.total_sessions" suffix="次" :precision="0" />
            </view>
          </view>
          <view class="metric-item-flat">
            <text class="lbl">平均{{ themeStore.t('comfortLevel') }}</text>
            <text class="val">★{{ activeReport.avg_comfort.toFixed(1) }}</text>
          </view>
        </view>

        <!-- 商品换算 -->
        <view class="comparisons-section-flat" v-if="activeReport.purchasing_comparisons.length > 0">
          <view class="section-title-flat">{{ purchasingTitle }}</view>
          <view class="comparisons-list-flat">
            <view 
              class="comparison-row-flat" 
              v-for="(item, idx) in activeReport.purchasing_comparisons" 
              :key="idx"
            >
              <text class="comp-name">{{ item.item_name }}</text>
              <text class="comp-qty">可买 <text class="highlight">{{ item.quantity_affordable }}</text> 份</text>
            </view>
          </view>
        </view>

        <!-- 团队成就 -->
        <view class="team-rank-section-flat" v-if="activeReport.rank_in_groups.length > 0">
          <view class="section-title-flat">{{ teamTitle }}</view>
          <view class="team-rank-row-flat" v-for="team in activeReport.rank_in_groups" :key="team.group_id">
            <text class="team-name">{{ team.group_name }}</text>
            <text class="team-rank">排名：第 <text class="highlight">{{ team.rank }}</text> 名 / 共 {{ team.total_members }} 人</text>
          </view>
        </view>

        <!-- 趣味评语 -->
        <view class="commentary-box-flat">
          <text class="comm-title">OPINION / {{ commentaryTitle }}</text>
          <text class="comm-text">{{ commentaryMessage }}</text>
        </view>
      </view>

      <!-- 暂无周报 -->
      <view class="empty-state" v-else>
        <text class="empty-title">NO REPORT / 无周报</text>
        <text class="empty-desc">{{ emptyDescText }}</text>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { apiCall } from '../../services/api'
import { useThemeStore } from '../../stores/theme'
import { formatMinutes } from '../../utils/formatters'
import type { WeeklyReport } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const themeStore = useThemeStore()
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

// Dynamic labels
const reportTitle = computed(() => {
  return themeStore.isStock ? '周度交易研报' : '实验观察周报'
})

const purchasingTitle = computed(() => {
  return themeStore.isStock ? '资产采购能力换算' : '科研资源配置换算'
})

const teamTitle = computed(() => {
  return themeStore.isStock ? '自营团队对冲争霸' : '实验室课题组大比拼'
})

const commentaryTitle = computed(() => {
  return themeStore.isStock ? '首席分析师点评' : '学术导师复审意见'
})

const emptyDescText = computed(() => {
  return themeStore.isStock
    ? '每周一早上将自动生成您上周的交易对账单。快去开盘委单积累数据吧！'
    : '每周一早上将自动生成您上周的实验报告单。快去开动反应器积累数据吧！'
})

// 趣味评语
const commentaryMessage = computed(() => {
  if (!activeReport.value) return ''
  const sessions = activeReport.value.total_sessions
  
  if (themeStore.isStock) {
    if (sessions >= 10) {
      return '本周交易委单极度频繁，简直是市场最强多头主力！老板看到此项数据，流下了感动的泪水，并默默扣紧了钱包。持仓战神当之无愧！'
    } else if (sessions >= 5) {
      return '本周套利节奏非常健康，开平仓把握度绝佳。交易把控行云流水，既保证了资金流安全，也赚取了丰厚回报。堪称自营团队楷模！'
    } else {
      return '本周交易流水寥寥，是否市场交投清淡，或者工作太忙忘记了开盘？机会转瞬即逝，请注意盯盘，不要让资金白白沉睡！'
    }
  } else {
    if (sessions >= 10) {
      return '本周反应测试极其密集，是实验室当之无愧的产能之王！导师看着论文发表进度表示大受震撼。实验之星非你莫属！'
    } else if (sessions >= 5) {
      return '本周科研进度稳扎稳打，反应步骤张弛有度。实验参数控制极度精细，既保证了数据可复现，也实现了高效产出。堪称学术先锋！'
    } else {
      return '本周反应次数偏低，是否被琐碎杂务打扰，实验进度有些滞后？科学研究贵在坚持，请适时启动仪器，不要让反应釜空守尘土！'
    }
  }
})

const formatDateRange = (start: number, end: number): string => {
  const s = new Date(start)
  const e = new Date(end)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${s.getFullYear()}.${pad(s.getMonth() + 1)}.${pad(s.getDate())} - ${e.getFullYear()}.${pad(e.getMonth() + 1)}.${pad(e.getDate())}`
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

// 选择器
.picker-card-flat {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .picker-label {
    font-size: 24rpx;
    color: var(--text-primary);
    font-weight: 800;
  }

  .picker-value-box {
    display: flex;
    align-items: center;
    gap: 12rpx;
    background-color: var(--bg-primary);
    border: 1rpx solid var(--border);
    padding: 12rpx 24rpx;

    .val {
      font-size: 22rpx;
      font-weight: bold;
      color: var(--accent-warn);
      font-family: var(--font-mono);
    }

    .arrow {
      font-size: 16rpx;
      color: var(--text-secondary);
    }
  }
}

// 周报正文扁平布局
.report-layout-flat {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  width: 100%;

  .report-header {
    border-bottom: 2rpx solid var(--border);
    padding-bottom: 24rpx;

    .header-meta {
      display: flex;
      flex-direction: column;
      gap: 6rpx;

      .title {
        font-size: 36rpx;
        font-weight: 800;
        color: var(--text-primary);
        letter-spacing: 1rpx;
      }
      .date-range {
        font-size: 18rpx;
        color: var(--text-secondary);
        font-family: var(--font-mono);
      }
    }
  }
}

// 汇总网格
.metrics-grid-flat {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  border-bottom: 1rpx dashed var(--border);
  padding-bottom: 30rpx;

  .metric-item-flat {
    background-color: transparent;
    border: 1rpx solid var(--border);
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .lbl {
      font-size: 18rpx;
      color: var(--text-secondary);
      margin-bottom: 8rpx;
      text-transform: uppercase;
      letter-spacing: 1rpx;
    }

    .val {
      font-size: 26rpx;
      font-weight: 800;
      color: var(--text-primary);
    }

    .salary-text {
      font-size: 34rpx;
      color: var(--accent);
      font-family: var(--font-mono);
    }
  }
}

// 购买力
.comparisons-section-flat {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border);
  padding-bottom: 30rpx;

  .section-title-flat {
    font-size: 22rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .comparisons-list-flat {
    display: flex;
    flex-direction: column;
    gap: 12rpx;

    .comparison-row-flat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16rpx 0;
      border-bottom: 1rpx solid var(--border);

      &:last-child {
        border-bottom: none;
      }

      .comp-name {
        font-size: 22rpx;
        color: var(--text-primary);
        font-weight: 600;
      }

      .comp-qty {
        font-size: 20rpx;
        color: var(--text-secondary);

        .highlight {
          color: var(--accent-warn);
          font-weight: 800;
          font-family: var(--font-mono);
        }
      }
    }
  }
}

// 团队争霸
.team-rank-section-flat {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  border-bottom: 1rpx dashed var(--border);
  padding-bottom: 30rpx;

  .section-title-flat {
    font-size: 22rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .team-rank-row-flat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1rpx solid var(--border);

    &:last-child {
      border-bottom: none;
    }

    .team-name {
      font-size: 22rpx;
      font-weight: 600;
      color: var(--accent-info);
    }

    .team-rank {
      font-size: 20rpx;
      color: var(--text-secondary);

      .highlight {
        color: var(--accent-warn);
        font-weight: 800;
        font-family: var(--font-mono);
      }
    }
  }
}

// 评语卡
.commentary-box-flat {
  border: 1rpx solid var(--border);
  background-color: var(--bg-card);
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .comm-title {
    font-size: 18rpx;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .comm-text {
    font-size: 20rpx;
    color: var(--text-secondary);
    line-height: 1.5;
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

.theme-stock {
  .metric-item-flat {
    background-color: var(--bg-card);
  }
}
</style>
