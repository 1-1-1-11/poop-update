import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiCall } from '../services/api'
import { calculateEarnings } from '../utils/salary-calculator'
import type { ApiResponse } from '../services/api'
import type { PoopSession, SessionCreateResult } from '../utils/types'

export const usePoopStore = defineStore('poop', () => {
  const isPooping = ref<boolean>(false)
  const startTime = ref<number>(0)
  const elapsedSeconds = ref<number>(0)
  const realtimeEarnings = ref<number>(0)
  
  let timerId: any = null

  // 本地持久化状态的 key
  const KEY_IS_POOPING = 'baba_poop_active'
  const KEY_START_TIME = 'baba_poop_start_time'

  // 恢复之前因为退出页面而中断的计时器
  const restoreSession = (
    monthlySalary: number,
    workDaysPerMonth: number,
    workHoursPerDay: number
  ) => {
    try {
      const active = uni.getStorageSync(KEY_IS_POOPING)
      const start = uni.getStorageSync(KEY_START_TIME)

      if (active === 'true' && start) {
        isPooping.value = true
        startTime.value = parseInt(start)
        const diff = Math.floor((Date.now() - startTime.value) / 1000)
        
        // 限制在两小时内，如果过久则自动作废
        if (diff > 0 && diff <= 7200) {
          elapsedSeconds.value = diff
          realtimeEarnings.value = calculateEarnings(monthlySalary, diff, workDaysPerMonth, workHoursPerDay)
          startTimer(monthlySalary, workDaysPerMonth, workHoursPerDay)
        } else {
          cancelPoop()
        }
      }
    } catch (e) {
      cancelPoop()
    }
  }

  const startPoop = (
    monthlySalary: number,
    workDaysPerMonth: number,
    workHoursPerDay: number
  ) => {
    isPooping.value = true
    startTime.value = Date.now()
    elapsedSeconds.value = 0
    realtimeEarnings.value = 0

    try {
      uni.setStorageSync(KEY_IS_POOPING, 'true')
      uni.setStorageSync(KEY_START_TIME, startTime.value.toString())
    } catch (e) {}

    startTimer(monthlySalary, workDaysPerMonth, workHoursPerDay)
  }

  const startTimer = (
    monthlySalary: number,
    workDaysPerMonth: number,
    workHoursPerDay: number
  ) => {
    if (timerId) clearInterval(timerId)

    timerId = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000)
      
      // 两小时自动作废或提示
      if (elapsedSeconds.value > 7200) {
        elapsedSeconds.value = 7200
        clearInterval(timerId)
      }

      realtimeEarnings.value = calculateEarnings(
        monthlySalary,
        elapsedSeconds.value,
        workDaysPerMonth,
        workHoursPerDay
      )
    }, 1000)
  }

  const cancelPoop = () => {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
    isPooping.value = false
    startTime.value = 0
    elapsedSeconds.value = 0
    realtimeEarnings.value = 0

    try {
      uni.removeStorageSync(KEY_IS_POOPING)
      uni.removeStorageSync(KEY_START_TIME)
    } catch (e) {}
  }

  // 停止计时，但保留当前时间秒数和收益数据，以便在结果页结算
  const stopPoop = () => {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
    
    const finalSeconds = Math.floor((Date.now() - startTime.value) / 1000)
    elapsedSeconds.value = Math.min(finalSeconds, 7200)
    
    try {
      uni.removeStorageSync(KEY_IS_POOPING)
      uni.removeStorageSync(KEY_START_TIME)
    } catch (e) {}
  }

  // 结算保存
  const savePoop = async (
    comfortLevel: number,
    note: string
  ): Promise<ApiResponse<SessionCreateResult> | null> => {
    const finalEndTime = startTime.value + elapsedSeconds.value * 1000
    
    try {
      const res = await apiCall<SessionCreateResult>('session-manager', 'create', {
        start_time: startTime.value,
        end_time: finalEndTime,
        comfort_level: comfortLevel,
        note
      })

      if (res.code === 0 && res.data) {
        // 完成后，主动调用成就系统检查徽章
        try {
          await apiCall('achievement-checker', 'check', {
            session: res.data.session
          })
        } catch (badgeErr) {
          console.error('检查成就徽章失败:', badgeErr)
        }

        // 清理状态
        isPooping.value = false
        startTime.value = 0
        elapsedSeconds.value = 0
        realtimeEarnings.value = 0
        return res
      }
      return res
    } catch (e: any) {
      console.error('保存拉屎记录失败:', e)
      return { code: 500, msg: e.message || '保存记录失败' }
    }
  }

  return {
    isPooping,
    startTime,
    elapsedSeconds,
    realtimeEarnings,
    restoreSession,
    startPoop,
    cancelPoop,
    stopPoop,
    savePoop
  }
})
