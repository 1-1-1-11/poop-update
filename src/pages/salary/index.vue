<template>
  <view class="page-container" :class="themeStore.themeClass" v-if="userStore.user">
    <PageTransition>
      <!-- 当前薪资信息 (对账总额) -->
      <ThemeCard customClass="salary-board-flat">
        <view class="card-title">{{ currentHourlyLabel }}</view>
        <view class="hourly-rate-box">
          <text class="currency">¥</text>
          <NumberTicker class="value" :value="hourlyRate" :precision="2" />
          <text class="unit">/ 小时</text>
        </view>
        <view class="meta-row">
          <text class="meta-label">{{ salaryMetaLabel }}：¥{{ userStore.user.monthly_salary }}</text>
          <text class="meta-label">{{ daysMetaLabel }}：{{ userStore.user.work_days_per_month }}天</text>
          <text class="meta-label">{{ hoursMetaLabel }}：{{ userStore.user.work_hours_per_day }}小时</text>
        </view>
      </ThemeCard>

      <!-- 薪资变更表单 -->
      <ThemeCard customClass="form-card-flat">
        <view class="form-title">// {{ formTitle }}</view>

        <view class="form-item">
          <text class="label">{{ monthlySalaryLabel }}</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="salary" 
            :placeholder="salaryPlaceholder"
          />
        </view>

        <view class="row-fields">
          <view class="form-item half">
            <text class="label">{{ daysLabel }}</text>
            <input 
              class="input" 
              type="number" 
              v-model.number="workDays" 
              placeholder="默认 22"
            />
          </view>

          <view class="form-item half">
            <text class="label">{{ hoursLabel }}</text>
            <input 
              class="input" 
              type="number" 
              v-model.number="workHours" 
              placeholder="默认 8"
            />
          </view>
        </view>

        <view class="form-item">
          <text class="label">{{ changeNoteLabel }}</text>
          <input 
            class="input" 
            type="text" 
            v-model="changeNote" 
            :placeholder="changeNotePlaceholder"
            maxlength="20"
          />
        </view>

        <button class="submit-btn" :loading="saving" @tap="handleSave">
          {{ submitButtonText }}
        </button>
      </ThemeCard>

      <!-- 变更历史时间轴 -->
      <ThemeCard customClass="history-card-flat" v-if="salaryHistory.length > 0">
        <view class="card-title">{{ historyTitle }}</view>
        <view class="timeline">
          <view 
            class="timeline-item" 
            v-for="(item, idx) in salaryHistory" 
            :key="idx"
          >
            <view class="timeline-dot"></view>
            <view class="timeline-content">
              <view class="history-header">
                <text class="history-salary">¥{{ item.monthly_salary }} /月</text>
                <text class="history-date">{{ formatDate(item.effective_date) }}</text>
              </view>
              <text class="history-note" v-if="item.note">// {{ item.note }}</text>
            </view>
          </view>
        </view>
      </ThemeCard>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { apiCall } from '../../services/api'
import { calculateHourlyRate } from '../../utils/salary-calculator'
import type { SalaryRecord } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()

const salary = ref<number | ''>('')
const workDays = ref(22)
const workHours = ref(8)
const changeNote = ref('')
const saving = ref(false)
const salaryHistory = ref<SalaryRecord[]>([])

onShow(() => {
  if (userStore.user) {
    salary.value = userStore.user.monthly_salary
    workDays.value = userStore.user.work_days_per_month
    workHours.value = userStore.user.work_hours_per_day
    fetchSalaryHistory()
  }
})

const hourlyRate = computed(() => {
  if (!userStore.user) return 0
  return calculateHourlyRate(
    userStore.user.monthly_salary,
    userStore.user.work_days_per_month,
    userStore.user.work_hours_per_day
  )
})

// Dynamic labels
const currentHourlyLabel = computed(() => {
  return themeStore.isStock ? '实时对冲结算汇率' : '当前实验代谢率基准'
})

const salaryMetaLabel = computed(() => {
  return themeStore.isStock ? '基本薪资' : '研发经费'
})

const daysMetaLabel = computed(() => {
  return themeStore.isStock ? '结算周期' : '反应周期'
})

const hoursMetaLabel = computed(() => {
  return themeStore.isStock ? '日规工时' : '日规时长'
})

const formTitle = computed(() => {
  return themeStore.isStock ? '汇率及工时校准' : '经费及反应周期配置'
})

const monthlySalaryLabel = computed(() => {
  return themeStore.isStock ? '月度基本协议薪酬 (元)' : '月度核定实验资助经费 (元)'
})

const salaryPlaceholder = computed(() => {
  return themeStore.isStock ? '协议月薪额' : '实验总经费/月'
})

const daysLabel = computed(() => themeStore.isStock ? '月法定结算天数' : '月度实验天数')
const hoursLabel = computed(() => themeStore.isStock ? '日协议工时数' : '日规定实验工时')
const changeNoteLabel = computed(() => themeStore.isStock ? '汇率变更备忘录 (说明)' : '变更课题备忘录')
const changeNotePlaceholder = computed(() => themeStore.isStock ? '例如：绩效上调、跳槽改约' : '例如：课题变更、设备升级')
const submitButtonText = computed(() => themeStore.isStock ? '应用并重新开盘' : '应用变更并校准')
const historyTitle = computed(() => themeStore.isStock ? '汇率校准历史日志' : '周期与经费变更底账')

const fetchSalaryHistory = async () => {
  try {
    const res = await apiCall<{ history: SalaryRecord[] }>('user-manager', 'getSalaryHistory')
    if (res.code === 0 && res.data) {
      salaryHistory.value = res.data.history
    }
  } catch (e) {
    console.error(e)
  }
}

const handleSave = async () => {
  if (!salary.value || salary.value <= 0) {
    uni.showToast({ title: '请输入有效的金额', icon: 'none' })
    return
  }
  if (!workDays.value || workDays.value <= 0 || workDays.value > 31) {
    uni.showToast({ title: '请输入合理的天数', icon: 'none' })
    return
  }
  if (!workHours.value || workHours.value <= 0 || workHours.value > 24) {
    uni.showToast({ title: '请输入合理的小时数', icon: 'none' })
    return
  }

  saving.value = true
  const success = await userStore.updateSalary(
    Number(salary.value),
    workDays.value,
    workHours.value,
    changeNote.value.trim()
  )
  saving.value = false

  if (success) {
    uni.showToast({ title: '参数已校准', icon: 'none' })
    changeNote.value = ''
    fetchSalaryHistory()
  } else {
    uni.showToast({ title: userStore.errorMsg || '更新失败', icon: 'none' })
  }
}

const formatDate = (timeMs: number): string => {
  const d = new Date(timeMs)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
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

// 头部扁平对账总额板
.salary-board-flat {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .card-title {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .hourly-rate-box {
    display: flex;
    align-items: baseline;
    justify-content: center;
    padding: 10rpx 0;

    .currency {
      font-size: 36rpx;
      font-weight: 800;
      color: var(--accent);
      margin-right: 8rpx;
    }

    .value {
      font-size: 64rpx;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--accent);
    }

    .unit {
      font-size: 20rpx;
      margin-left: 8rpx;
      color: var(--text-secondary);
    }
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 18rpx;
    border-top: 1rpx solid var(--border);
    padding-top: 20rpx;
    text-align: center;
    color: var(--text-secondary);
  }
}

// 表单卡
.form-card-flat {
  display: flex;
  flex-direction: column;
  border: 1rpx solid var(--border);

  .form-title {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 32rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;

  .label {
    font-size: 22rpx;
    color: var(--text-secondary);
    margin-bottom: 12rpx;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1rpx;
  }

  .input {
    background-color: var(--bg-primary);
    border: 1rpx solid var(--border);
    height: 80rpx;
    padding: 0 20rpx;
    font-size: 24rpx;
    color: var(--text-primary);
    box-sizing: border-box;
    font-family: var(--font-mono);

    &:focus {
      border-color: var(--accent);
    }
  }
}

.row-fields {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;

  .half {
    flex: 1;
  }
}

.submit-btn {
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
  margin-top: 20rpx;

  &:active {
    opacity: 0.9;
  }
}

// 历史列表
.history-card-flat {
  display: flex;
  flex-direction: column;

  .card-title {
    font-size: 20rpx;
    font-weight: 800;
    color: var(--text-secondary);
    margin-bottom: 32rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
  padding-left: 20rpx;

  .timeline-item {
    position: relative;
    padding-left: 40rpx;
    padding-bottom: 32rpx;
    border-left: 1rpx solid var(--border);

    &:last-child {
      border-left: none;
      padding-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: -9rpx;
      top: 12rpx;
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background-color: var(--accent);
    }

    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 8rpx;

      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .history-salary {
          font-size: 24rpx;
          font-weight: 800;
          color: var(--text-primary);
          font-family: var(--font-mono);
        }

        .history-date {
          font-size: 18rpx;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
      }

      .history-note {
        font-size: 20rpx;
        color: var(--text-secondary);
        font-family: var(--font-mono);
      }
    }
  }
}
</style>
