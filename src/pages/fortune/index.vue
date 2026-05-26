<template>
  <view class="fortune-container">
    <!-- 黄历主体卡片 -->
    <view class="almanac-card">
      <view class="calendar-header">
        <text class="date-gregorian">{{ currentDateStr }}</text>
        <text class="lunar-lbl">{{ lunarDateStr }}</text>
      </view>

      <view class="divider"></view>

      <!-- 屎运得分 -->
      <view class="fortune-score-section">
        <text class="score-lbl">今日屎运指数</text>
        <view class="score-circle">
          <text class="score-num">{{ score }}</text>
          <text class="score-pct">分</text>
        </view>
        <text class="score-evaluation" :style="{ color: scoreColor }">{{ evaluation }}</text>
      </view>

      <view class="divider"></view>

      <!-- 黄金指南 -->
      <view class="golden-tips">
        <view class="tip-row">
          <text class="label">⏰ 黄金时段：</text>
          <text class="val">{{ goldenTime }}</text>
        </view>
        <view class="tip-row">
          <text class="label">🚽 幸运坑位：</text>
          <text class="val">{{ luckyStall }}</text>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 宜与忌 -->
      <view class="yi-ji-section">
        <view class="yi-column">
          <view class="title-circle yi">宜</view>
          <view class="item-list">
            <text class="item" v-for="y in yiItems" :key="y">{{ y }}</text>
          </view>
        </view>
        
        <view class="split-line"></view>

        <view class="ji-column">
          <view class="title-circle ji">忌</view>
          <view class="item-list">
            <text class="item" v-for="j in jiItems" :key="j">{{ j }}</text>
          </view>
        </view>
      </view>

      <view class="divider"></view>

      <!-- 每日神谕 -->
      <view class="quote-section">
        <text class="quote-label">💡 每日摸鱼神谕：</text>
        <text class="quote-text">“ {{ dailyQuote }} ”</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

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

const generateFortune = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  currentDateStr.value = `${year}年${month}月${day}日`

  // 基于日期的伪随机种子，保证同一天打开生成相同的运势
  const seed = (year * 367 + month * 31 + day) % 100

  // 生成仿农历标注 (天干地支 + 月日)
  const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const lunarMonth = ((month + seed) % 12) + 1
  const lunarDay = ((day + seed) % 30) + 1
  const yearStem = heavenlyStems[(year - 4) % 10]
  const yearBranch = earthlyBranches[(year - 4) % 12]
  const yearZodiac = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'][(year - 4) % 12]
  const monthStem = earthlyBranches[(lunarMonth - 1) % 12]
  const dayStem = earthlyBranches[(lunarDay - 1) % 12]
  const yiSuffix = seed % 2 === 0 ? '(宜排泄)' : '(宜摸鱼)'
  lunarDateStr.value = `${yearStem}${yearBranch}年 (${yearZodiac}年) ${monthStem}月${dayStem}日 ${yiSuffix}`

  // 1. 计算得分 (70 - 100)
  score.value = 70 + (seed % 31)

  // 2. 评语和颜色
  if (score.value >= 95) {
    evaluation.value = '拉屎封神 宜打持久战'
    scoreColor.value = '#4CAF50' // 绿色健康
  } else if (score.value >= 85) {
    evaluation.value = '顺畅无比 捞钱良机'
    scoreColor.value = '#FF8C42' // 经典暖橙
  } else {
    evaluation.value = '略显曲折 稳妥为主'
    scoreColor.value = '#FFC107' // 黄色预警
  }

  // 3. 黄金时间
  const times = [
    '09:45 - 10:15 (打卡半小时后，老板正忙)',
    '10:30 - 11:00 (上午思路闭塞期，建议带薪摸鱼)',
    '14:00 - 14:30 (午后倦怠期，排毒提神最佳)',
    '15:30 - 16:00 (下午茶时间，配着白噪音效率翻倍)',
    '17:00 - 17:30 (临近下班，蓄力拉最后一泡带薪粑粑)'
  ]
  goldenTime.value = times[seed % times.length]

  // 4. 幸运坑位
  const stalls = [
    '靠墙3号深水坑位 (隐蔽安静，信号满格)',
    '最内侧5号坑位 (通风管道口下方，空气清新)',
    '无障碍大坑位 (空间开阔，利于思考架构)',
    '中间2号坑位 (隔音效果佳，适合刷视频放外音)',
    '靠窗1号坑位 (微风拂面，拉屎体验极佳)'
  ]
  luckyStall.value = stalls[(seed + 3) % stalls.length]

  // 5. 宜 / 忌 库
  const yiPool = ['带手机', '看短视频', '静音外放', '思考人生', '喝冰美式', '用三层纸', '双脚垫高', '戴降噪耳机']
  const jiPool = ['憋着不拉', '打高画质手游', '忘带手纸', '发出巨响', '蹲超过30分钟', '老板在门外', 'Wi-Fi断网', '吃辣后排泄']

  // 洗牌选择
  const shuffledYi = [...yiPool].sort((a, b) => ((a.charCodeAt(0) * seed) % 10) - ((b.charCodeAt(0) * seed) % 10))
  const shuffledJi = [...jiPool].sort((a, b) => ((a.charCodeAt(0) * (seed + 1)) % 10) - ((b.charCodeAt(0) * (seed + 1)) % 10))

  yiItems.value = shuffledYi.slice(0, 3)
  jiItems.value = shuffledJi.slice(0, 3)

  // 6. 神谕
  const quotes = [
    '不要因为工作忙碌，就冷落了等候您的马桶。',
    '每一秒蹲马桶的时间，都是您对资本家最无声的抗议。',
    '工作是老板的，但拉屎赚的钱是自己的。',
    '拉出来的叫粑粑，捞回去的叫真金白银。',
    '蹲下是凡人，起立是带薪摸鱼的英雄。',
    '生活就像拉屎，有时候你使了很大劲，出来的却只是个屁。所以顺其自然。'
  ]
  dailyQuote.value = quotes[seed % quotes.length]
}
</script>

<style lang="scss" scoped>
.fortune-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  box-sizing: border-box;
}

// 黄历纸质卡片
.almanac-card {
  width: 100%;
  background-color: #fffdf9; // 宣纸色线
  border-radius: $radius-lg;
  padding: 48rpx 36rpx;
  box-shadow: $shadow-md;
  border: 4rpx double #d4af37; // 仿古金线
  display: flex;
  flex-direction: column;
  gap: 28rpx;

  .calendar-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;

    .date-gregorian {
      font-size: 36rpx;
      font-weight: 800;
      color: $text-primary;
    }

    .lunar-lbl {
      font-size: 22rpx;
      color: #b8860b;
      font-weight: bold;
    }
  }

  .divider {
    height: 2rpx;
    background-color: #f0e6df;
  }
}

// 运势环
.fortune-score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;

  .score-lbl {
    font-size: 24rpx;
    color: $text-secondary;
    font-weight: bold;
  }

  .score-circle {
    width: 180rpx;
    height: 180rpx;
    border-radius: 999rpx;
    border: 8rpx solid #ffd700;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #ffffff;
    box-shadow: inset 0 0 20rpx rgba(255, 215, 0, 0.2);

    .score-num {
      font-size: 72rpx;
      font-weight: 800;
      color: $color-primary-dark;
      font-family: 'Georgia', serif;
    }

    .score-pct {
      font-size: 24rpx;
      color: $text-secondary;
      margin-left: 4rpx;
      align-self: flex-end;
      margin-bottom: 24rpx;
    }
  }

  .score-evaluation {
    font-size: 28rpx;
    font-weight: 800;
  }
}

// 指南
.golden-tips {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  background-color: #fff9e8;
  border-radius: $radius-sm;
  padding: 20rpx 24rpx;
  border: 1rpx solid #ffe6a3;

  .tip-row {
    display: flex;
    font-size: 24rpx;

    .label {
      color: #8b6508;
      font-weight: bold;
      flex-shrink: 0;
    }
    .val {
      color: $text-primary;
      font-weight: 500;
    }
  }
}

// 宜与忌列表排版
.yi-ji-section {
  display: flex;
  justify-content: space-between;
  padding: 0 10rpx;
  position: relative;

  .yi-column, .ji-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
  }

  .title-circle {
    width: 60rpx;
    height: 60rpx;
    border-radius: 999rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 28rpx;
    font-weight: 800;
    color: #ffffff;
    box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.15);
  }

  .title-circle.yi { background-color: #4CAF50; }
  .title-circle.ji { background-color: #f44336; }

  .item-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;

    .item {
      font-size: 24rpx;
      font-weight: bold;
      color: $text-primary;
    }
  }

  .split-line {
    width: 2rpx;
    background-color: #f0e6df;
    align-self: stretch;
    margin: 0 20rpx;
  }
}

// 摸鱼神谕
.quote-section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  background-color: #f5f5f5;
  border-radius: $radius-sm;
  padding: 24rpx;
  border: 1rpx solid #e5e5e5;

  .quote-label {
    font-size: 22rpx;
    color: $text-hint;
    font-weight: bold;
  }

  .quote-text {
    font-size: 24rpx;
    color: $text-secondary;
    font-style: italic;
    line-height: 1.4;
    text-align: center;
  }
}
</style>
