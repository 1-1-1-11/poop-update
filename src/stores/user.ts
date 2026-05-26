import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserSettings } from '../utils/types'
import { apiCall, resetMockDatabase } from '../services/api'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref<boolean>(false)
  const errorMsg = ref<string>('')

  const isRegistered = computed(() => user.value !== null)

  const loadProfile = async (): Promise<boolean> => {
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await apiCall<{ user: User }>('user-center', 'getProfile')
      if (res.code === 0 && res.data?.user) {
        user.value = res.data.user
        return true
      } else {
        user.value = null
        return false
      }
    } catch (e: any) {
      errorMsg.value = e.message || '加载用户数据失败'
      user.value = null
      return false
    } finally {
      loading.value = false
    }
  }

  const register = async (
    nickname: string, 
    monthlySalary: number, 
    workDaysPerMonth: number = 22, 
    workHoursPerDay: number = 8
  ): Promise<boolean> => {
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await apiCall<{ user: User }>('user-center', 'register', {
        nickname,
        monthly_salary: monthlySalary,
        work_days_per_month: workDaysPerMonth,
        work_hours_per_day: workHoursPerDay
      })
      if (res.code === 0 && res.data?.user) {
        user.value = res.data.user
        return true
      } else {
        errorMsg.value = res.msg || '注册失败'
        return false
      }
    } catch (e: any) {
      errorMsg.value = e.message || '注册发生错误'
      return false
    } finally {
      loading.value = false
    }
  }

  const updateSalary = async (
    monthlySalary: number,
    workDaysPerMonth?: number,
    workHoursPerDay?: number,
    note?: string
  ): Promise<boolean> => {
    if (!user.value) return false
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await apiCall<{ user: User }>('user-center', 'updateSalary', {
        monthly_salary: monthlySalary,
        work_days_per_month: workDaysPerMonth || user.value.work_days_per_month,
        work_hours_per_day: workHoursPerDay || user.value.work_hours_per_day,
        note
      })
      if (res.code === 0 && res.data?.user) {
        user.value = res.data.user
        return true
      } else {
        errorMsg.value = res.msg || '更新薪资失败'
        return false
      }
    } catch (e: any) {
      errorMsg.value = e.message || '更新薪资错误'
      return false
    } finally {
      loading.value = false
    }
  }

  const updateUserSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
    if (!user.value) return false
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await apiCall('user-center', 'updateSettings', { settings })
      if (res.code === 0) {
        user.value.settings = { ...user.value.settings, ...settings }
        return true
      } else {
        errorMsg.value = res.msg || '更新设置失败'
        return false
      }
    } catch (e: any) {
      errorMsg.value = e.message || '更新设置错误'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    resetMockDatabase()
    user.value = null
  }

  return {
    user,
    loading,
    errorMsg,
    isRegistered,
    loadProfile,
    register,
    updateSalary,
    updateUserSettings,
    logout
  }
})
