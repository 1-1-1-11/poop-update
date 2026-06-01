<template>
  <view class="chart-wrapper">
    <!-- #ifdef MP-WEIXIN -->
    <canvas :canvas-id="canvasId" class="chart-canvas" @touchstart="onTouch"></canvas>
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <canvas :id="canvasId" :canvas-id="canvasId" class="chart-canvas" @touchstart="onTouch"></canvas>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'
import { useThemeStore } from '../stores/theme'

const props = withDefaults(
  defineProps<{
    canvasId: string
    type: 'bar' | 'line' | 'scatter'
    data: { label: string; value: number }[]
  }>(),
  {
    type: 'bar',
    data: () => []
  }
)

const themeStore = useThemeStore()

const drawChart = () => {
  const ctx = uni.createCanvasContext(props.canvasId)
  if (!ctx) return

  // In uni-app, canvas dimensions are measured via select query
  const query = uni.createSelectorQuery()
  // Search for the canvas ID
  query.select(`.chart-canvas[canvas-id="${props.canvasId}"]`).boundingClientRect((rect: any) => {
    // If not found or not rendered yet, fallback to a standard aspect ratio
    const width = rect?.width || 340
    const height = rect?.height || 180

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Determine colors
    const isStock = themeStore.isStock
    const bgCard = isStock ? '#161B22' : '#FFFFFF'
    const textColor = isStock ? '#8B949E' : '#7F8C8D'
    const accentColor = isStock ? '#00E676' : '#2C3E50'
    const gridColor = isStock ? '#21262D' : '#EBEBEB'
    
    // Draw background
    ctx.setFillStyle(bgCard)
    ctx.fillRect(0, 0, width, height)

    const paddingLeft = 45
    const paddingRight = 15
    const paddingTop = 25
    const paddingBottom = 30
    
    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    // Grid lines (horizontal)
    ctx.setStrokeStyle(gridColor)
    ctx.setLineWidth(1)
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(width - paddingRight, y)
      ctx.stroke()
    }

    if (props.data.length === 0) {
      ctx.setFontSize(12)
      ctx.setFillStyle(textColor)
      ctx.setTextAlign('center')
      ctx.fillText('暂无数据', width / 2, height / 2)
      ctx.draw()
      return
    }

    // Min and Max values
    const values = props.data.map(d => d.value)
    const maxValue = Math.max(...values, 1)

    // Draw Y Axis Ticks/Labels
    ctx.setFontSize(9)
    ctx.setFillStyle(textColor)
    ctx.setTextAlign('right')
    for (let i = 0; i <= 4; i++) {
      const val = (maxValue / 4) * (4 - i)
      const y = paddingTop + (chartHeight / 4) * i + 3
      ctx.fillText(val.toFixed(1), paddingLeft - 8, y)
    }

    // Draw X Axis Labels
    ctx.setTextAlign('center')
    props.data.forEach((item, index) => {
      const x = paddingLeft + (chartWidth / Math.max(props.data.length - 1, 1)) * index
      ctx.fillText(item.label, x, height - 10)
    })

    // Draw Chart Content
    if (props.type === 'line') {
      // Draw path line
      ctx.beginPath()
      ctx.setStrokeStyle(accentColor)
      ctx.setLineWidth(2)
      
      props.data.forEach((item, index) => {
        const x = paddingLeft + (chartWidth / Math.max(props.data.length - 1, 1)) * index
        const y = paddingTop + chartHeight - (item.value / maxValue) * chartHeight
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Area gradient/fill below path line
      ctx.beginPath()
      ctx.moveTo(paddingLeft, paddingTop + chartHeight)
      props.data.forEach((item, index) => {
        const x = paddingLeft + (chartWidth / Math.max(props.data.length - 1, 1)) * index
        const y = paddingTop + chartHeight - (item.value / maxValue) * chartHeight
        ctx.lineTo(x, y)
      })
      ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight)
      ctx.closePath()
      ctx.setFillStyle(isStock ? 'rgba(0, 230, 118, 0.1)' : 'rgba(44, 62, 80, 0.05)')
      ctx.fill()

      // Draw dots
      props.data.forEach((item, index) => {
        const x = paddingLeft + (chartWidth / Math.max(props.data.length - 1, 1)) * index
        const y = paddingTop + chartHeight - (item.value / maxValue) * chartHeight
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.setFillStyle(accentColor)
        ctx.fill()
      })

    } else if (props.type === 'bar') {
      const barWidth = Math.min((chartWidth / props.data.length) * 0.6, 20)
      
      props.data.forEach((item, index) => {
        const x = paddingLeft + (chartWidth / props.data.length) * index + (chartWidth / props.data.length - barWidth) / 2
        const barHeight = (item.value / maxValue) * chartHeight
        const y = paddingTop + chartHeight - barHeight

        // Set bar color: stock gets theme-based alert/normal colors, lab gets info blue
        if (isStock) {
          ctx.setFillStyle(item.value > 0 ? '#00E676' : '#FF6B35')
        } else {
          ctx.setFillStyle('#3498DB')
        }
        
        // Draw rounded or simple rectangles
        ctx.fillRect(x, y, barWidth, Math.max(barHeight, 2))
      })
    }

    ctx.draw()
  }).exec()
}

watch(() => props.data, () => {
  nextTick(() => drawChart())
}, { deep: true })

watch(() => themeStore.currentTheme, () => {
  // Allow transitions to finish and canvas component to render under new styles
  setTimeout(() => drawChart(), 150)
})

onMounted(() => {
  setTimeout(() => drawChart(), 350)
})

const onTouch = () => {
  // Can expand into interactive touch indicators
}
</script>

<style lang="scss" scoped>
.chart-wrapper {
  width: 100%;
  height: 350rpx;
  box-sizing: border-box;
}
.chart-canvas {
  width: 100%;
  height: 100%;
}
</style>
