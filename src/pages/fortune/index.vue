<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <view class="fortune-layout">
        <!-- 头部日期 -->
        <view class="fortune-header">
          <text class="date-gregorian">{{ currentDateStr }}</text>
          <text class="lunar-lbl">{{ lunarDateStr }}</text>
        </view>

        <!-- 运势指数 -->
        <view class="score-section">
          <view class="score-row">
            <text class="score-lbl">{{ scoreTitle }}</text>
            <view class="score-box">
              <NumberTicker class="score-num" :value="score" :precision="0" />
              <text class="score-unit">%</text>
            </view>
          </view>
          <text class="score-evaluation" :style="{ color: scoreColor }">// STATUS: {{ evaluation }}</text>
        </view>

        <!-- 参数指标 -->
        <view class="tips-grid">
          <view class="tip-card-flat">
            <text class="label">{{ goldenTimeLabel }}</text>
            <text class="val">{{ goldenTime }}</text>
          </view>
          <view class="tip-card-flat">
            <text class="label">{{ luckyStallLabel }}</text>
            <text class="val">{{ luckyStall }}</text>
          </view>
        </view>

        <!-- 宜与忌对仗列表 -->
        <view class="yi-ji-grid">
          <view class="yiji-box yi">
            <text class="box-title">RECOMMENDED / 宜</text>
            <view class="item-list">
              <view class="item-row" v-for="y in yiItems" :key="y">
                <text class="bullet">■</text>
                <text class="item-text">{{ y }}</text>
              </view>
            </view>
          </view>
          
          <view class="yiji-box ji">
            <text class="box-title">AVOID / 忌</text>
            <view class="item-list">
              <view class="item-row" v-for="j in jiItems" :key="j">
                <text class="bullet">□</text>
                <text class="item-text">{{ j }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 每日神谕 / 实验信条 -->
        <view class="quote-box-flat">
          <text class="quote-label">{{ quoteLabel }}</text>
          <text class="quote-text">“{{ dailyQuote }}”</text>
        </view>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useThemeStore } from '../../stores/theme'

// Components
import PageTransition from '../../components/PageTransition.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const themeStore = useThemeStore()

const currentDateStr = ref('')
const lunarDateStr = ref('')
const score = ref(90)
const evaluation = ref('')
const scoreColor = ref('#FF8C42')
const goldenTime = ref('')
const luckyStall = ref('')
const yiItems = ref<string[]>([])
const jiItems = ref<string[]>([])
const dailyQuote = ref('')

onShow(() => {
  generateFortune()
})

// Dynamic labels
const scoreTitle = computed(() => {
  return themeStore.isStock ? '今日交易增值指数' : '实验纯净度与平稳系数'
})

const goldenTimeLabel = computed(() => {
  return themeStore.isStock ? '最佳平仓窗口' : '最佳取样观测窗口'
})

const luckyStallLabel = computed(() => {
  return themeStore.isStock ? '幸运交易席位号' : '幸运高精度工作台'
})

const quoteLabel = computed(() => {
  return themeStore.isStock ? '盘前交易格言' : '重点实验研究信条'
})

const generateFortune = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  currentDateStr.value = `${year}年${month}月${day}日`

  // 基于日期的伪随机种子
  const seed = (year * 367 + month * 31 + day) % 100

  // 农历标注
  const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const lunarMonth = ((month + seed) % 12) + 1
  const lunarDay = ((day + seed) % 30) + 1
  const yearStem = heavenlyStems[(year - 4) % 10]
  const yearBranch = earthlyBranches[(year - 4) % 12]
  const yearZodiac = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'][(year - 4) % 12]
  const monthStem = earthlyBranches[(lunarMonth - 1) % 12]
  const dayStem = earthlyBranches[(lunarDay - 1) % 12]
  const yiSuffix = themeStore.isStock ? '(宜开盘对冲)' : '(宜取样调试)'
  lunarDateStr.value = `${yearStem}${yearBranch}年 (${yearZodiac}年) ${monthStem}月${dayStem}日 ${yiSuffix}`

  // 1. 得分
  score.value = 75 + (seed % 26)

  // 2. 评语及颜色
  if (themeStore.isStock) {
    if (score.value >= 95) {
      evaluation.value = '牛市降临 宜重仓获利'
      scoreColor.value = '#00E676'
    } else if (score.value >= 85) {
      evaluation.value = '波动良好 稳健套利'
      scoreColor.value = '#58A6FF'
    } else {
      evaluation.value = '宽幅震荡 离盘观望'
      scoreColor.value = '#FF6B35'
    }
  } else {
    if (score.value >= 95) {
      evaluation.value = '反应极佳 纯净度99.9%'
      scoreColor.value = '#3498DB'
    } else if (score.value >= 85) {
      evaluation.value = '状态稳定 产出率正常'
      scoreColor.value = '#2ECC71'
    } else {
      evaluation.value = '活性异常 建议校准仪器'
      scoreColor.value = '#E74C3C'
    }
  }

  // 3. 黄金时间
  const stockTimes = [
    '09:45 - 10:15 (开盘确认趋势，平稳成交期)',
    '10:45 - 11:15 (主力休整期，适宜冷静对账)',
    '14:00 - 14:30 (午后蓄势期，避开跳水波段)',
    '15:00 - 15:30 (尾盘拉升期，落袋为安最佳)'
  ]
  const labTimes = [
    '09:00 - 09:30 (早间基准核对，仪器性能巅峰)',
    '11:00 - 11:30 (中期稳定性测试，数据采集极佳)',
    '14:30 - 15:00 (午后化学反应，宜静默记录曲线)',
    '16:30 - 17:00 (晚间数据核对，适合整理归档)'
  ]
  goldenTime.value = themeStore.isStock 
    ? stockTimes[seed % stockTimes.length]
    : labTimes[seed % labTimes.length]

  // 4. 幸运位置
  const stockStalls = [
    'VIP超极速交易席位 (光纤直连，延迟小于1ms)',
    '独立高级分析师单间 (隔音屏蔽，免噪声打扰)',
    '中央交易大厅2号机位 (全局视野，紧盯走势板)',
    '靠窗休息讨论区席位 (海风拂面，舒缓盯盘压力)'
  ]
  const labStalls = [
    '3号高精度静电天平间 (无尘无风，精确至微克)',
    '双重负压通风柜5号端口 (空气流速最佳，安全隔离)',
    '超净工作台2号位 (紫外灭菌彻底，无菌率高)',
    '恒温恒湿培养箱A区 (反应条件最恒定，误差极小)'
  ]
  luckyStall.value = themeStore.isStock
    ? stockStalls[(seed + 3) % stockStalls.length]
    : labStalls[(seed + 3) % labStalls.length]

  // 5. 宜与忌
  if (themeStore.isStock) {
    const yiPool = ['盯盘冷思', '签署合约', '分段止盈', '跟进多头', '喝冰咖啡', '降噪耳机', '背部靠垫']
    const jiPool = ['满仓抗单', '盲目听信八卦', '委单忘设止损', '频繁撤单', '网络卡顿', '疲劳看盘']
    yiItems.value = [...yiPool].sort(() => 0.5 - Math.random()).slice(0, 3)
    jiItems.value = [...jiPool].sort(() => 0.5 - Math.random()).slice(0, 3)
  } else {
    const yiPool = ['校准仪器', '双人复核', '记录曲线', '佩戴护目镜', '气阀核验', '备足耗材', '整理归档']
    const jiPool = ['伪造数据', '单人配试剂', '仪器漏气', '数据忘备份', '久坐不动', '盲目调参数']
    yiItems.value = [...yiPool].sort(() => 0.5 - Math.random()).slice(0, 3)
    jiItems.value = [...jiPool].sort(() => 0.5 - Math.random()).slice(0, 3)
  }

  // 6. 每日神谕
  const stockQuotes = [
    '不要因为一时的行情跳水，就忽略了资产的长期增值。',
    '每一次平仓委单，都是对市场利润最冷静的提取。',
    '合约是写在纸上的，但套利回来的盈亏是掌握在手中的。',
    '空头和多头都能在市场中生存，唯有贪婪 and 盲目不能。',
    '坐如磐石是交易员的本分，冷静平仓是锁住利润的终点。'
  ]
  const labQuotes = [
    '严谨的实验记录，是打开学术大门唯一的钥匙。',
    '仪器和软件只是一面镜子，实验数据的真实度才是科研的灵魂。',
    '每一次多余的误差，都是在为你将来的重做埋下伏笔。',
    '科学的终极奥义在于，于千万次扰动中寻找守恒的规律。',
    '蹲下是潜心求索的助理研究员，站起来是攻坚克难的领军人。'
  ]
  dailyQuote.value = themeStore.isStock
    ? stockQuotes[seed % stockQuotes.length]
    : labQuotes[seed % labQuotes.length]
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  padding: 40rpx;
}

.fortune-layout {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  width: 100%;
}

// 头部日期
.fortune-header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  border-bottom: 2rpx solid var(--border);
  padding-bottom: 24rpx;

  .date-gregorian {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: 1rpx;
  }

  .lunar-lbl {
    font-size: 20rpx;
    color: var(--accent-warn);
    font-weight: bold;
    letter-spacing: 2rpx;
  }
}

// 运势指数
.score-section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx dashed var(--border);

  .score-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .score-lbl {
      font-size: 24rpx;
      font-weight: 800;
      color: var(--text-secondary);
      letter-spacing: 2rpx;
      text-transform: uppercase;
    }

    .score-box {
      display: flex;
      align-items: baseline;

      .score-num {
        font-size: 64rpx;
        font-weight: 800;
        color: var(--accent);
        font-family: var(--font-mono);
      }

      .score-unit {
        font-size: 24rpx;
        color: var(--text-secondary);
        margin-left: 4rpx;
      }
    }
  }

  .score-evaluation {
    font-size: 22rpx;
    font-weight: 600;
    font-family: var(--font-mono);
  }
}

// 参数指标
.tips-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  border-bottom: 1rpx dashed var(--border);
  padding-bottom: 30rpx;

  .tip-card-flat {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .label {
      font-size: 18rpx;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 2rpx;
    }

    .val {
      font-size: 24rpx;
      font-weight: bold;
      color: var(--text-primary);
    }
  }
}

// 宜与忌对仗列表
.yi-ji-grid {
  display: flex;
  gap: 30rpx;
  border-bottom: 1rpx dashed var(--border);
  padding-bottom: 30rpx;

  .yiji-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;

    .box-title {
      font-size: 18rpx;
      font-weight: 800;
      letter-spacing: 2rpx;
    }

    &.yi {
      .box-title { color: var(--accent); }
      .bullet { color: var(--accent); }
    }

    &.ji {
      .box-title { color: var(--accent-warn); }
      .bullet { color: var(--accent-warn); }
    }

    .item-list {
      display: flex;
      flex-direction: column;
      gap: 12rpx;

      .item-row {
        display: flex;
        align-items: center;
        gap: 12rpx;

        .bullet {
          font-size: 14rpx;
        }

        .item-text {
          font-size: 22rpx;
          font-weight: 600;
          color: var(--text-primary);
        }
      }
    }
  }
}

// 每日神谕
.quote-box-flat {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
  border: 1rpx solid var(--border);
  background-color: var(--bg-card);

  .quote-label {
    font-size: 18rpx;
    color: var(--text-secondary);
    font-weight: 800;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .quote-text {
    font-size: 22rpx;
    color: var(--text-primary);
    font-style: italic;
    line-height: 1.5;
  }
}

// Stock Theme refinements
.theme-stock {
  .fortune-layout {
    background-color: var(--bg-card);
    border: 1rpx solid var(--border);
    padding: 40rpx;
  }
  .quote-box-flat {
    border-color: var(--border);
    background-color: var(--bg-primary);
  }
}

// Lab Theme refinements
.theme-lab {
  .fortune-layout {
    background-color: transparent;
    padding: 0;
  }
  .quote-box-flat {
    border: 1rpx solid var(--border);
    background-color: transparent;
  }
}
</style>
