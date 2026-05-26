<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('粑粑升职记启动')
})

onShow(() => {
  console.log('App Show')
})
</script>

<style lang="scss">
@import './styles/variables.scss';

page {
  background-color: $bg-primary;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: $text-primary;
  font-size: 28rpx;
}
</style>
