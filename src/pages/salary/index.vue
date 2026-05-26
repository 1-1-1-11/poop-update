<template>
  <view class="salary-settings-container" v-if="userStore.user">
    <!-- 当前薪资信息卡片 -->
    <view class="salary-card">
      <view class="card-title">当前摸鱼时薪</view>
      <view class="hourly-rate-box">
        <text class="currency">¥</text>
        <text class="value">{{ hourlyRate.toFixed(2) }}</text>
        <text class="unit">/ 小时</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">月薪：¥{{ userStore.user.monthly_salary }}</text>
        <text class="meta-label">月工作天数：{{ userStore.user.work_days_per_month }}天</text>
        <text class="meta-label">日工作时间：{{ userStore.user.work_hours_per_day }}小时</text>
      </view>
    </view>

    <!-- 薪资变更表单 -->
    <view class="form-card">
      <view class="form-title">调整薪资架构</view>

      <view class="form-item">
        <text class="label">新税前月薪 (元)</text>
        <input 
          class="input" 
          type="number" 
          v-model.number="salary" 
          placeholder="请输入新的月薪"
        />
      </view>

      <view class="row-fields">
        <view class="form-item half">
          <text class="label">工作天数 / 月</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="workDays" 
            placeholder="默认 22"
          />
        </view>

        <view class="form-item half">
          <text class="label">工作小时 / 天</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="workHours" 
            placeholder="默认 8"
          />
        </view>
      </view>

      <view class="form-item">
        <text class="label">变更备注 (如：跳槽、升职加薪！)</text>
        <input 
          class="input" 
          type="text" 
          v-model="changeNote" 
          placeholder="给这次变更写个备注吧"
          maxlength="20"
        />
      </view>

      <button class="submit-btn" :loading="saving" @tap="handleSave">
        保存变更
      </button>
    </view>

    <!-- 变更历史时间轴 -->
    <view class="history-card" v-if="salaryHistory.length > 0">
      <view class="card-title">薪资变更历史</view>
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
            <text class="history-note" v-if="item.note">📝 {{ item.note }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { apiCall } from '../../services/api'
import { calculateHourlyRate } from '../../utils/salary-calculator'
import type { SalaryRecord } from '../../utils/types'

const userStore = useUserStore()

const salary = ref<number | ''>('')
const workDays = ref(22)
const workHours = ref(8)
const changeNote = ref('')
const saving = ref(false)

const salaryHistory = ref<SalaryRecord[]>([])

onShow(async () => {
  if (userStore.user) {
    salary.value = userStore.user.monthly_salary
    workDays.value = userStore.user.work_days_per_month
    workHours.value = userStore.user.work_hours_per_day
  }
  await fetchHistory()
})

const hourlyRate = computed(() => {
  if (!userStore.user) return 0
  return calculateHourlyRate(
    userStore.user.monthly_salary,
    userStore.user.work_days_per_month,
    userStore.user.work_hours_per_day
  )
})

const fetchHistory = async () => {
  try {
    const res = await apiCall<{ history: SalaryRecord[] }>('user-center', 'getSalaryHistory')
    if (res.code === 0 && res.data) {
      // 倒序展示最新变更
      salaryHistory.value = [...res.data.history].sort((a, b) => b.effective_date - a.effective_date)
    }
  } catch (e) {
    console.error(e)
  }
}

const handleSave = async () => {
  if (salary.value === '' || salary.value < 0) {
    uni.showToast({ title: '请输入正确的月薪', icon: 'none' })
    return
  }
  if (workDays.value < 1 || workDays.value > 31) {
    uni.showToast({ title: '月工作天数范围1-31', icon: 'none' })
    return
  }
  if (workHours.value < 1 || workHours.value > 24) {
    uni.showToast({ title: '日工作小时范围1-24', icon: 'none' })
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
    uni.showToast({ title: '薪资调整成功！', icon: 'success' })
    changeNote.value = ''
    await fetchHistory()
  } else {
    uni.showToast({ title: userStore.errorMsg || '调整失败', icon: 'none' })
  }
}

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
</script>

<style lang="scss" scoped>
.salary-settings-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 薪水卡
.salary-card {
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-md;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;

  .card-title {
    font-size: 24rpx;
    opacity: 0.8;
    letter-spacing: 2rpx;
  }

  .hourly-rate-box {
    display: flex;
    align-items: baseline;
    margin: 24rpx 0;

    .currency {
      font-size: 40rpx;
      font-weight: bold;
      margin-right: 8rpx;
    }

    .value {
      font-size: 80rpx;
      font-weight: 800;
      font-family: 'Courier New', Courier, monospace;
    }

    .unit {
      font-size: 24rpx;
      margin-left: 8rpx;
      opacity: 0.8;
    }
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 20rpx;
    opacity: 0.8;
    border-top: 2rpx solid rgba(255, 255, 255, 0.2);
    padding-top: 20rpx;
    text-align: center;
  }
}

// 表单卡
.form-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;

  .form-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    margin-bottom: 32rpx;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;

  .label {
    font-size: 24rpx;
    color: $text-secondary;
    margin-bottom: 12rpx;
    font-weight: 600;
  }

  .input {
    background-color: #fafafa;
    border: 1rpx solid #e0e0e0;
    border-radius: $radius-sm;
    height: 80rpx;
    padding: 0 20rpx;
    font-size: 26rpx;
    color: $text-primary;
    box-sizing: border-box;

    &:focus {
      border-color: $color-primary;
      background-color: #ffffff;
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
  background: linear-gradient(90deg, $color-primary 0%, $color-primary-dark 100%);
  color: $text-white;
  font-size: 30rpx;
  font-weight: bold;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: $radius-round;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(255, 140, 66, 0.3);
  margin-top: 20rpx;

  &:active {
    transform: scale(0.98);
  }
}

// 历史列表
.history-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;

  .card-title {
    font-size: 28rpx;
    font-weight: bold;
    color: $text-secondary;
    margin-bottom: 32rpx;
    border-left: 6rpx solid $color-primary;
    padding-left: 16rpx;
    line-height: 1;
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
    border-left: 2rpx solid #ffd8c0;

    &:last-child {
      border-left: none;
      padding-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: -11rpx;
      top: 10rpx;
      width: 20rpx;
      height: 20rpx;
      border-radius: 999rpx;
      background-color: $color-primary;
      border: 4rpx solid #ffffff;
      box-shadow: 0 0 10rpx rgba(255, 140, 66, 0.4);
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
          font-size: 28rpx;
          font-weight: bold;
          color: $text-primary;
        }

        .history-date {
          font-size: 20rpx;
          color: $text-hint;
        }
      }

      .history-note {
        font-size: 22rpx;
        color: $text-secondary;
        background-color: #fff9f5;
        border-radius: 6rpx;
        padding: 8rpx 16rpx;
        align-self: flex-start;
      }
    }
  }
}
</style>
