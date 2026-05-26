<template>
  <view class="login-container">
    <view class="welcome-section">
      <!-- 趣味道具：大拉屎 Emoji -->
      <text class="emoji-logo">💩</text>
      <text class="app-title">粑粑升职记</text>
      <text class="app-slogan">每一次如厕，都是一次升职加薪的机会</text>
    </view>

    <view class="form-card">
      <view class="form-title">初始化您的个人资料</view>

      <view class="form-item">
        <text class="label">我的昵称</text>
        <input 
          class="input" 
          type="text" 
          v-model="nickname" 
          placeholder="请输入您在马桶上的尊称" 
          maxlength="12"
        />
      </view>

      <view class="form-item">
        <text class="label">税前月薪 (元)</text>
        <input 
          class="input" 
          type="number" 
          v-model.number="monthlySalary" 
          placeholder="请输入税前月薪，用于计算秒薪"
        />
      </view>

      <view class="row-fields">
        <view class="form-item half">
          <text class="label">月工作天数</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="workDays" 
            placeholder="默认 22"
          />
        </view>

        <view class="form-item half">
          <text class="label">日工作小时</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="workHours" 
            placeholder="默认 8"
          />
        </view>
      </view>

      <button class="submit-btn" :loading="loading" @tap="handleRegister">
        开启摸鱼之旅
      </button>

      <view class="hint-text">
        * 您的数据将仅用于本地带薪计算，隐私安全绝不泄露。
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const nickname = ref('拉屎小能手')
const monthlySalary = ref<number | ''>('')
const workDays = ref(22)
const workHours = ref(8)
const loading = ref(false)

const handleRegister = async () => {
  if (!nickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  if (monthlySalary.value === '' || monthlySalary.value <= 0) {
    uni.showToast({ title: '请填写有效的月薪', icon: 'none' })
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

  loading.value = true
  const success = await userStore.register(
    nickname.value.trim(),
    Number(monthlySalary.value),
    workDays.value,
    workHours.value
  )
  loading.value = false

  if (success) {
    uni.showToast({ title: '欢迎踏入带薪生涯！', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }, 1200)
  } else {
    uni.showModal({
      title: '注册失败',
      content: userStore.errorMsg || '请重试',
      showCancel: false
    })
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, $bg-primary 0%, #ffe6d0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 80rpx 40rpx;
  box-sizing: border-box;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
  text-align: center;

  .emoji-logo {
    font-size: 140rpx;
    filter: drop-shadow(0 8rpx 16rpx rgba(0,0,0,0.1));
    margin-bottom: 20rpx;
    animation: bounce 2s infinite alternate;
  }

  .app-title {
    font-size: 56rpx;
    font-weight: 800;
    color: $color-primary-dark;
    letter-spacing: 2rpx;
  }

  .app-slogan {
    font-size: 26rpx;
    color: $text-secondary;
    margin-top: 16rpx;
  }
}

.form-card {
  width: 100%;
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 48rpx 40rpx;
  box-shadow: $shadow-lg;
  box-sizing: border-box;

  .form-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 40rpx;
    text-align: center;
    border-bottom: 2rpx solid #f5f5f5;
    padding-bottom: 20rpx;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 32rpx;

  .label {
    font-size: 26rpx;
    color: $text-secondary;
    font-weight: 600;
    margin-bottom: 12rpx;
  }

  .input {
    background-color: #fcf8f5;
    border: 2rpx solid #ffd8c0;
    border-radius: $radius-sm;
    height: 90rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: $text-primary;
    box-sizing: border-box;
    transition: all 0.3s ease;

    &:focus {
      border-color: $color-primary;
      background-color: #ffffff;
      box-shadow: 0 0 10rpx rgba(255, 140, 66, 0.2);
    }
  }
}

.row-fields {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;

  .half {
    flex: 1;
  }
}

.submit-btn {
  background: linear-gradient(90deg, $color-primary 0%, $color-primary-dark 100%);
  color: $text-white;
  font-size: 32rpx;
  font-weight: bold;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: $radius-round;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(255, 140, 66, 0.4);
  margin-top: 40rpx;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 10rpx rgba(255, 140, 66, 0.2);
  }
}

.hint-text {
  font-size: 22rpx;
  color: $text-hint;
  text-align: center;
  margin-top: 32rpx;
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-20rpx);
  }
}
</style>
