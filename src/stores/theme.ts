import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { themeLabels } from '../config/theme-labels'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<'stock' | 'lab'>(
    (uni.getStorageSync('baba_theme') as 'stock' | 'lab') || 'stock'
  )

  const themeClass = computed(() => `theme-${currentTheme.value}`)

  const isStock = computed(() => currentTheme.value === 'stock')
  const isLab = computed(() => currentTheme.value === 'lab')

  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'stock' ? 'lab' : 'stock'
    uni.setStorageSync('baba_theme', currentTheme.value)
    
    // Set status bar styles dynamically if supported
    if (currentTheme.value === 'stock') {
      uni.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: '#0D1117',
        animation: { duration: 400, timingFunc: 'easeIn' }
      })
    } else {
      uni.setNavigationBarColor({
        frontColor: '#000000',
        backgroundColor: '#F8F9FA',
        animation: { duration: 400, timingFunc: 'easeIn' }
      })
    }
  }

  // A convenient translation helper function
  const t = (key: string): string => {
    const item = themeLabels[key]
    if (!item) return key
    return item[currentTheme.value] || key
  }

  return {
    currentTheme,
    themeClass,
    isStock,
    isLab,
    toggleTheme,
    t
  }
})
