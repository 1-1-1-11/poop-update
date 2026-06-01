<template>
  <view class="page-container" :class="themeStore.themeClass">
    <!-- 顶部右上角快速主题切换 (扁平按钮) -->
    <view class="quick-theme-toggle-flat" @tap="switchTheme">
      <text class="toggle-text">{{ themeStore.isStock ? 'VISUAL: STOCK' : 'VISUAL: LAB' }}</text>
    </view>

    <PageTransition>
      <view class="welcome-section">
        <text class="app-title">{{ appTitle }}</text>
        <text class="app-slogan">{{ appSlogan }}</text>
      </view>

      <ThemeCard customClass="form-card-flat">
        <view class="form-title">// {{ formTitle }}</view>

        <view class="form-item">
          <text class="label">{{ nameLabel }}</text>
          <input 
            class="input" 
            type="text" 
            v-model="nickname" 
            :placeholder="namePlaceholder" 
            maxlength="12"
          />
        </view>

        <view class="form-item">
          <text class="label">{{ salaryLabel }}</text>
          <input 
            class="input" 
            type="number" 
            v-model.number="monthlySalary" 
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

        <button class="submit-btn" :loading="loading" @tap="handleRegister">
          {{ submitButtonText }}
        </button>

        <view class="hint-text">
          * 您的数据仅存储于本地浏览器/微信环境，绝不上传云端，隐私安全受本地隔离保护。
        </view>
      </ThemeCard>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { useThemeTransition } from '../../composables/useThemeTransition'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()
const { switchTheme } = useThemeTransition()

const nickname = ref('探索者一号')
const monthlySalary = ref<number | ''>('')
const workDays = ref(22)
const workHours = ref(8)
const loading = ref(false)

// Dynamic labels based on theme
const appTitle = computed(() => themeStore.isStock ? '交易员升职记' : '重点实验升职记')
const appSlogan = computed(() => {
  return themeStore.isStock
    ? '每一次开盘委单，都是一次增值套利的机会'
    : '每一次反应观测，都是一次科学探索的积累'
})

const formTitle = computed(() => themeStore.isStock ? '交易席位激活' : '研究员身份注册')

const nameLabel = computed(() => themeStore.isStock ? '交易员代号(昵称)' : '研究员代号(昵称)')
const namePlaceholder = computed(() => themeStore.isStock ? '输入交易代号' : '输入研究员昵称')

const salaryLabel = computed(() => themeStore.isStock ? '月基本薪资(CNY)' : '月度研发经费/薪酬')
const salaryPlaceholder = computed(() => themeStore.isStock ? '输入你的薪酬/月' : '研发资助/月薪')

const daysLabel = computed(() => themeStore.isStock ? '结算工作日/月' : '实验观察日/月')
const hoursLabel = computed(() => themeStore.isStock ? '标准工时/天' : '标准实验工时/天')

const submitButtonText = computed(() => themeStore.isStock ? '激活席位' : '注册并启动')

const handleRegister = async () => {
  if (!nickname.value.trim()) {
    uni.showToast({ title: '请输入昵称/代号', icon: 'none' })
    return
  }

  if (!monthlySalary.value || monthlySalary.value <= 0) {
    uni.showToast({ title: '请输入薪资/研发资助', icon: 'none' })
    return
  }

  if (workDays.value < 1 || workDays.value > 31) {
    uni.showToast({ title: '天数范围为1-31天', icon: 'none' })
    return
  }

  if (workHours.value < 1 || workHours.value > 24) {
    uni.showToast({ title: '工时范围为1-24小时', icon: 'none' })
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
    uni.showToast({ title: '激活成功，欢迎登机！', icon: 'none' })
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      })
    }, 1200)
  } else {
    uni.showModal({
      title: '注册失败',
      content: userStore.errorMsg || '请检查输入',
      showCancel: false
    })
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 80rpx 40rpx;
  position: relative;
}

// 快速切换主题按钮
.quick-theme-toggle-flat {
  position: absolute;
  top: 40rpx;
  right: 40rpx;
  z-index: 10;
  display: flex;
  align-items: center;
  background-color: transparent;
  border: 1rpx solid var(--border);
  padding: 12rpx 20rpx;
  cursor: pointer;

  .toggle-text {
    font-size: 20rpx;
    color: var(--text-primary);
    font-weight: 800;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 80rpx;
  margin-bottom: 60rpx;
  text-align: center;

  .app-title {
    font-size: 48rpx;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 4rpx;
    text-transform: uppercase;
  }

  .app-slogan {
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-top: 16rpx;
    line-height: 1.5;
  }
}

.form-card-flat {
  width: 100%;
  border: 1rpx solid var(--border);

  .form-title {
    font-size: 28rpx;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 40rpx;
    text-align: center;
    border-bottom: 2rpx solid var(--border);
    padding-bottom: 20rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 32rpx;

  .label {
    font-size: 22rpx;
    color: var(--text-secondary);
    font-weight: 800;
    margin-bottom: 12rpx;
    text-transform: uppercase;
    letter-spacing: 1rpx;
  }

  .input {
    background-color: var(--bg-primary);
    border: 1rpx solid var(--border);
    height: 90rpx;
    padding: 0 24rpx;
    font-size: 26rpx;
    color: var(--text-primary);
    box-sizing: border-box;

    &:focus {
      border-color: var(--accent);
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
  margin-top: 40rpx;

  &:active {
    opacity: 0.9;
  }
}

.hint-text {
  font-size: 20rpx;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 32rpx;
  line-height: 1.5;
}
</style>
