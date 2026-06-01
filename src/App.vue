<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()

onLaunch(() => {
  console.log('粑粑升职记启动')
  
  // Set initial navigation bar color
  if (themeStore.isStock) {
    uni.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#0D1117'
    })
  } else {
    uni.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F8F9FA'
    })
  }
})

onShow(() => {
  console.log('App Show')
})
</script>

<style lang="scss">
@use './styles/variables.scss' as *;
@use './styles/theme-stock.scss';
@use './styles/theme-lab.scss';

page {
  background-color: $bg-primary;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: $text-primary;
  font-size: 28rpx;
  transition: background-color 0.4s ease, color 0.4s ease;
  min-height: 100vh;
}

// Global page containers transitions
.page-container, .theme-wrapper {
  transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
}
</style>
