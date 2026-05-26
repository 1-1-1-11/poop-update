import type {
  User,
  PoopSession,
  Badge,
  Group,
  WeeklyReport,
  StatsData,
  AnnualReport,
  LeaderboardEntry,
  SalaryRecord,
  ComfortLevel
} from '../utils/types'
import { BADGE_DEFINITIONS } from '../utils/badge-definitions'
import { getTitleByXP, calculateEarnings, getFeedbackType, calculateSessionXP } from '../utils/salary-calculator'
import { getTopComparisons } from '../utils/purchase-items'
import { getLocalDateString } from '../utils/formatters'

// 统一的 API 调用返回值
export interface ApiResponse<T = any> {
  code: number
  msg?: string
  data?: T
}

// 模拟本地数据库
class MockDatabase {
  private static PREFIX = 'baba_promo_'

  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = uni.getStorageSync(this.PREFIX + key)
      return data ? JSON.parse(data) : defaultValue
    } catch (e) {
      return defaultValue
    }
  }

  static set(key: string, val: any): void {
    try {
      uni.setStorageSync(this.PREFIX + key, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  }

  static clear(): void {
    const keys = ['current_uid', 'user', 'sessions', 'groups', 'weekly_reports']
    keys.forEach(k => {
      try {
        uni.removeStorageSync(this.PREFIX + k)
      } catch (e) {}
    })
  }
}

function getWeekStartTimestamp(timestamp: number): number {
  const d = new Date(timestamp)
  const utc = timestamp + d.getTimezoneOffset() * 60000
  const nd = new Date(utc + 3600000 * 8)
  const day = nd.getDay()
  const diff = nd.getDate() - day + (day === 0 ? -6 : 1) // 调整到周一
  const monday = new Date(nd.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.getTime()
}

// 核心 Mock 引擎
class MockServer {
  // 注入初始模拟数据
  static initialize() {
    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return

    const sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    if (sessions.length === 0) {
      console.log('检测到本地 Mock 库为空，正在初始化 30 天模拟拉屎数据...')
      const mockSessions: PoopSession[] = []
      const now = Date.now()
      
      // 产生过去 30 天内的随机拉屎数据
      let accumulatedEarnings = 0
      let accumulatedDuration = 0
      let accumulatedXP = 0
      const baseSalary = user.monthly_salary

      for (let i = 30; i >= 1; i--) {
        // 每天 0-2 次拉屎
        const poopCount = Math.floor(Math.random() * 3) // 0, 1, 2
        for (let j = 0; j < poopCount; j++) {
          const poopHour = 9 + Math.floor(Math.random() * 9) // 9:00 - 18:00 摸鱼时间
          const sessionDate = new Date(now - i * 24 * 3600 * 1000)
          sessionDate.setHours(poopHour, Math.floor(Math.random() * 60), 0, 0)
          
          const startTime = sessionDate.getTime()
          const durationMinutes = 3 + Math.floor(Math.random() * 20) // 3 - 23 分钟
          const durationSeconds = durationMinutes * 60
          const endTime = startTime + durationSeconds * 1000
          
          const comfortLevel = (1 + Math.floor(Math.random() * 5)) as ComfortLevel
          const earnings = calculateEarnings(baseSalary, durationSeconds, user.work_days_per_month, user.work_hours_per_day)
          const feedbackType = getFeedbackType(durationSeconds)
          const xpEarned = calculateSessionXP(durationSeconds, comfortLevel, mockSessions.length > 0)
          
          const sessionNotes = [
            '思考了一下人生，豁然开朗',
            '今天带薪拉屎赚了杯奶茶，爽！',
            '刷了会儿短视频，脚蹲麻了',
            '肚子有点不舒服，多蹲了一会儿',
            '顺畅无比，打工人加油！',
            '思考Bug怎么解，果然在马桶上有灵感',
            ''
          ]
          const note = sessionNotes[Math.floor(Math.random() * sessionNotes.length)]

          mockSessions.push({
            _id: `mock-session-${i}-${j}-${Math.random().toString(36).substr(2, 5)}`,
            user_id: user._id,
            start_time: startTime,
            end_time: endTime,
            duration_seconds: durationSeconds,
            earnings,
            salary_at_time: baseSalary,
            comfort_level: comfortLevel,
            feedback_type: feedbackType,
            xp_earned: xpEarned,
            note,
            is_work_hours: poopHour >= 9 && poopHour < 18,
            created_at: endTime
          })

          accumulatedEarnings += earnings
          accumulatedDuration += durationSeconds
          accumulatedXP += xpEarned
        }
      }

      // 按时间从旧到新排序，方便后续连续打卡计算等
      mockSessions.sort((a, b) => a.start_time - b.start_time)
      MockDatabase.set('sessions', mockSessions)

      // 更新用户生涯累积数据
      user.total_xp = accumulatedXP
      user.total_poop_earnings = Math.round(accumulatedEarnings * 100) / 100
      user.total_sessions = mockSessions.length
      user.total_duration_seconds = accumulatedDuration
      
      const newTitleDef = getTitleByXP(accumulatedXP)
      user.current_title = newTitleDef.title
      user.current_level = newTitleDef.level
      user.streak_days = 5 // 默认 5 天打卡
      user.badges = ['first_poop', 'first_group'] // 预设一两个徽章

      MockDatabase.set('user', user)
      console.log(`模拟拉屎数据装填完毕。累计如厕: ${user.total_sessions}次, 累计摸鱼收益: ¥${user.total_poop_earnings}`)

      // 初始化模拟周报
      const weeklyReports: WeeklyReport[] = []
      const weekStarts = new Set(mockSessions.map(s => getWeekStartTimestamp(s.start_time)))
      
      Array.from(weekStarts).sort((a, b) => b - a).slice(0, 4).forEach((ws, idx) => {
        const weekSessions = mockSessions.filter(s => getWeekStartTimestamp(s.start_time) === ws)
        if (weekSessions.length === 0) return

        const wDuration = weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0)
        const wEarnings = weekSessions.reduce((sum, s) => sum + s.earnings, 0)
        const wComfort = weekSessions.reduce((sum, s) => sum + s.comfort_level, 0)
        const wBest = Math.max(...weekSessions.map(s => s.earnings))

        weeklyReports.push({
          _id: `mock-report-${ws}`,
          user_id: user._id,
          week_start: ws,
          week_end: ws + 7 * 86400000 - 1,
          total_sessions: weekSessions.length,
          total_duration_seconds: wDuration,
          total_earnings: Math.round(wEarnings * 100) / 100,
          avg_comfort: Math.round((wComfort / weekSessions.length) * 10) / 10,
          best_session_earnings: Math.round(wBest * 100) / 100,
          purchasing_comparisons: getTopComparisons(wEarnings, 4),
          rank_in_groups: [
            {
              group_id: 'mock-group-1',
              group_name: '摸鱼划水大队',
              rank: 2 + (idx % 2),
              total_members: 4
            }
          ],
          generated_at: Date.now()
        })
      })
      MockDatabase.set('weekly_reports', weeklyReports)

      // 初始化模拟战队
      const mockGroup: Group = {
        _id: 'mock-group-1',
        name: '摸鱼划水大队',
        creator_id: 'mock-teammate-1',
        invite_code: 'SLACKR',
        member_ids: [user._id, 'mock-teammate-1', 'mock-teammate-2', 'mock-teammate-3'],
        max_members: 50,
        is_anonymous: false,
        created_at: now - 30 * 24 * 3600 * 1000
      }
      MockDatabase.set('groups', [mockGroup])
    }
  }

  // 1. user-center
  static register(params: any): ApiResponse {
    const { nickname, monthly_salary, work_days_per_month = 22, work_hours_per_day = 8 } = params
    if (!nickname || !monthly_salary) {
      return { code: 400, msg: '昵称和月薪为必填项' }
    }

    const existUser = MockDatabase.get<User | null>('user', null)
    if (existUser) {
      // 幂等操作
      return { code: 0, msg: '已登录', data: { user: existUser } }
    }

    const uid = 'mock-user-' + Math.random().toString(36).substr(2, 9)
    const now = Date.now()

    const newUser: User = {
      _id: uid,
      nickname,
      avatar_url: '',
      monthly_salary: Math.round(monthly_salary),
      work_days_per_month,
      work_hours_per_day,
      salary_history: [
        {
          monthly_salary: Math.round(monthly_salary),
          effective_date: now,
          note: '初始设置'
        }
      ],
      current_title: '厕所实习生',
      current_level: 1,
      total_xp: 0,
      total_poop_earnings: 0,
      total_sessions: 0,
      total_duration_seconds: 0,
      streak_days: 0,
      last_session_date: '',
      badges: [],
      group_ids: [],
      settings: {
        long_sit_alert: true,
        long_sit_minutes: 20,
        hydration_reminder: false,
        weekly_report_push: true,
        sound_enabled: true,
        bgm_enabled: false
      },
      created_at: now,
      updated_at: now
    }

    MockDatabase.set('current_uid', uid)
    MockDatabase.set('user', newUser)

    // 装填 mock 历史数据
    this.initialize()

    // 重新获取一下（带装填后最新的生涯属性）
    const freshUser = MockDatabase.get<User>('user', newUser)
    return { code: 0, msg: '注册成功', data: { user: freshUser } }
  }

  static getProfile(): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    return { code: 0, data: { user } }
  }

  static updateSalary(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    const { monthly_salary, work_days_per_month, work_hours_per_day, note } = params
    if (monthly_salary === undefined || monthly_salary < 0) {
      return { code: 400, msg: '月薪参数无效' }
    }

    const now = Date.now()
    const newSalary = Math.round(monthly_salary)
    const oldSalary = user.monthly_salary

    user.monthly_salary = newSalary
    if (work_days_per_month) user.work_days_per_month = work_days_per_month
    if (work_hours_per_day) user.work_hours_per_day = work_hours_per_day
    user.updated_at = now

    if (newSalary !== oldSalary) {
      const record: SalaryRecord = {
        monthly_salary: newSalary,
        effective_date: now,
        note: note || (newSalary > oldSalary ? '升职加薪！' : '薪资调整')
      }
      user.salary_history = [...(user.salary_history || []), record]
    }

    MockDatabase.set('user', user)
    return { code: 0, msg: '薪资更新成功', data: { user } }
  }

  static getSalaryHistory(): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    return { code: 0, data: { history: user.salary_history || [] } }
  }

  static updateSettings(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    const { settings } = params
    if (!settings || typeof settings !== 'object') {
      return { code: 400, msg: '设置参数无效' }
    }

    user.settings = { ...user.settings, ...settings }
    user.updated_at = Date.now()

    MockDatabase.set('user', user)
    return { code: 0, msg: '设置已更新' }
  }

  // 2. session-manager
  static createSession(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    const { start_time, end_time, comfort_level, note } = params
    if (!start_time || !end_time || !comfort_level) {
      return { code: 400, msg: '参数不完整' }
    }

    const durationSeconds = Math.round((end_time - start_time) / 1000)
    if (durationSeconds < 1) return { code: 400, msg: '如厕时长太短' }
    if (durationSeconds > 7200) return { code: 400, msg: '单次如厕不能超过2小时' }

    const earnings = calculateEarnings(
      user.monthly_salary,
      durationSeconds,
      user.work_days_per_month,
      user.work_hours_per_day
    )
    const feedbackType = getFeedbackType(durationSeconds)

    // 简单打卡连续天数判断
    const todayStr = getLocalDateString(start_time)
    const yesterdayStr = getLocalDateString(start_time - 86400000)
    const lastPoopDate = user.last_session_date || ''
    
    let newStreakDays = user.streak_days || 0
    if (lastPoopDate === yesterdayStr) {
      newStreakDays += 1
    } else if (lastPoopDate !== todayStr) {
      newStreakDays = 1
    }

    const xpEarned = calculateSessionXP(durationSeconds, comfort_level, newStreakDays > 1)
    const newTotalXP = (user.total_xp || 0) + xpEarned
    const newTitleDef = getTitleByXP(newTotalXP)
    const leveledUp = newTitleDef.level > (user.current_level || 1)

    const session: PoopSession = {
      _id: 'session-' + Math.random().toString(36).substr(2, 9),
      user_id: uid,
      start_time,
      end_time,
      duration_seconds: durationSeconds,
      earnings,
      salary_at_time: user.monthly_salary,
      comfort_level,
      feedback_type: feedbackType,
      xp_earned: xpEarned,
      note: note || '',
      is_work_hours: true, // 简化默认在工作时间
      created_at: Date.now()
    }

    // 保存 session
    const sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    sessions.push(session)
    MockDatabase.set('sessions', sessions)

    // 更新用户数据
    user.total_xp = newTotalXP
    user.total_poop_earnings = Math.round((user.total_poop_earnings + earnings) * 100) / 100
    user.total_sessions += 1
    user.total_duration_seconds += durationSeconds
    user.streak_days = newStreakDays
    user.last_session_date = todayStr
    user.current_level = newTitleDef.level
    user.current_title = newTitleDef.title
    user.updated_at = Date.now()
    MockDatabase.set('user', user)

    return {
      code: 0,
      msg: '记录成功',
      data: {
        session,
        feedback_type: feedbackType,
        xp_earned: xpEarned,
        total_xp: newTotalXP,
        current_level: newTitleDef.level,
        current_title: newTitleDef.title,
        leveled_up: leveledUp,
        streak_days: newStreakDays
      }
    }
  }

  static listSessions(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { page = 1, limit = 20, date_start, date_end } = params || {}
    let sessions = MockDatabase.get<PoopSession[]>('sessions', [])

    // 过滤
    if (date_start) {
      sessions = sessions.filter(s => s.start_time >= date_start)
    }
    if (date_end) {
      sessions = sessions.filter(s => s.start_time <= date_end)
    }

    // 按时间倒序
    sessions.sort((a, b) => b.start_time - a.start_time)

    const total = sessions.length
    const start = (page - 1) * limit
    const paged = sessions.slice(start, start + limit)

    return {
      code: 0,
      data: {
        sessions: paged,
        total,
        page,
        limit,
        has_more: start + paged.length < total
      }
    }
  }

  static getStats(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { period = 'week' } = params || {}
    let sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    const now = Date.now()
    let startTime = 0

    if (period === 'week') {
      startTime = now - 7 * 86400000
    } else if (period === 'month') {
      startTime = now - 30 * 86400000
    } else if (period === 'year') {
      startTime = now - 365 * 86400000
    }

    if (startTime > 0) {
      sessions = sessions.filter(s => s.start_time >= startTime)
    }

    if (sessions.length === 0) {
      return {
        code: 0,
        data: {
          period,
          total_sessions: 0,
          total_duration_seconds: 0,
          total_earnings: 0,
          avg_duration_seconds: 0,
          avg_comfort: 0,
          avg_earnings: 0,
          best_session_earnings: 0,
          daily_distribution: [],
          hourly_distribution: new Array(24).fill(0),
          comfort_trend: []
        }
      }
    }

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
    const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
    const totalComfort = sessions.reduce((sum, s) => sum + s.comfort_level, 0)
    const bestEarnings = Math.max(...sessions.map(s => s.earnings))

    const hourlyDist = new Array(24).fill(0)
    const dailyMap: { [date: string]: any } = {}

    sessions.forEach(s => {
      // 小时分布
      const hour = new Date(s.start_time).getHours()
      hourlyDist[hour]++

      // 每日分布
      const dateStr = getLocalDateString(s.start_time)
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, count: 0, earnings: 0, duration: 0, comfort_sum: 0 }
      }
      dailyMap[dateStr].count++
      dailyMap[dateStr].earnings += s.earnings
      dailyMap[dateStr].duration += s.duration_seconds
      dailyMap[dateStr].comfort_sum += s.comfort_level
    })

    const dailyDistribution = Object.keys(dailyMap).map(date => {
      const item = dailyMap[date]
      return {
        date,
        sessions: item.count, // 后端 schema 用 sessions 表示当日频次
        earnings: Math.round(item.earnings * 100) / 100,
        duration: item.duration,
        avg_comfort: Math.round((item.comfort_sum / item.count) * 10) / 10
      }
    }).sort((a, b) => a.date.localeCompare(b.date))

    const comfortTrend = dailyDistribution.map(d => ({
      date: d.date,
      avg_comfort: d.avg_comfort
    }))

    const statsData: StatsData = {
      period,
      total_sessions: sessions.length,
      total_duration_seconds: totalDuration,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      avg_duration_seconds: Math.round(totalDuration / sessions.length),
      avg_comfort: Math.round((totalComfort / sessions.length) * 10) / 10,
      avg_earnings: Math.round((totalEarnings / sessions.length) * 100) / 100,
      best_session_earnings: Math.round(bestEarnings * 100) / 100,
      daily_distribution: dailyDistribution as any,
      hourly_distribution: hourlyDist,
      comfort_trend: comfortTrend
    }

    return { code: 0, data: statsData }
  }

  static getDailyStats(params: any): ApiResponse {
    const { year, month } = params || {}
    if (!year || !month) return { code: 400, msg: '缺少年份和月份' }

    let sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    
    // 过滤年月
    const days: any[] = []
    const dailyMap: { [day: number]: { count: number; earnings: number; duration: number } } = {}

    sessions.forEach(s => {
      const d = new Date(s.start_time)
      if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
        const day = d.getDate()
        if (!dailyMap[day]) {
          dailyMap[day] = { count: 0, earnings: 0, duration: 0 }
        }
        dailyMap[day].count++
        dailyMap[day].earnings += s.earnings
        dailyMap[day].duration += s.duration_seconds
      }
    })

    Object.keys(dailyMap).forEach(dayKey => {
      const day = parseInt(dayKey)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({
        date: dateStr,
        count: dailyMap[day].count,
        earnings: Math.round(dailyMap[day].earnings * 100) / 100,
        duration: dailyMap[day].duration
      })
    })

    return {
      code: 0,
      data: {
        year,
        month,
        days
      }
    }
  }

  static getDetail(params: any): ApiResponse {
    const { session_id } = params
    if (!session_id) return { code: 400, msg: '缺少记录ID' }

    const sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    const session = sessions.find(s => s._id === session_id)
    if (!session) return { code: 404, msg: '记录不存在' }

    return { code: 0, data: { session } }
  }

  // 3. achievement-checker
  static checkAchievements(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    const { session } = params || {}
    const earnedBadgeKeys = user.badges || []
    const newlyEarned: Badge[] = []

    // 轮询徽章规则，计算是否解锁
    BADGE_DEFINITIONS.forEach(def => {
      if (earnedBadgeKeys.includes(def.key)) return

      let met = false
      const { type, threshold } = def.condition

      switch (type) {
        case 'total_sessions':
          met = user.total_sessions >= threshold
          break
        case 'total_duration_seconds':
          met = user.total_duration_seconds >= threshold
          break
        case 'total_earnings':
          met = user.total_poop_earnings >= threshold
          break
        case 'streak_days':
          met = user.streak_days >= threshold
          break
        case 'groups_joined':
          met = (user.group_ids || []).length >= threshold
          break
        case 'groups_created':
          met = MockDatabase.get<Group[]>('groups', []).filter(g => g.creator_id === uid).length >= threshold
          break
        case 'session_over_seconds':
          met = session && session.duration_seconds >= threshold
          break
        case 'session_under_seconds':
          met = session && session.duration_seconds > 0 && session.duration_seconds <= threshold
          break
        case 'single_earnings':
          met = session && session.earnings >= threshold
          break
        case 'comfort_level':
          met = session && session.comfort_level >= threshold
          break
        case 'sessions_in_day':
          // 简化，当天 mock 或者历史记录次数是否达标
          if (session) {
            const daySessions = MockDatabase.get<PoopSession[]>('sessions', [])
              .filter(s => getLocalDateString(s.start_time) === getLocalDateString(session.start_time))
            met = daySessions.length >= threshold
          }
          break
        case 'session_hour_range':
          if (session) {
            const hr = new Date(session.start_time).getHours()
            if (threshold === 6) met = hr >= 6 && hr < 7 // 早起
            if (threshold === 0) met = hr >= 0 && hr < 3 // 熬夜
          }
          break
      }

      if (met) {
        const badge: Badge = {
          _id: 'badge-' + def.key,
          ...def
        }
        newlyEarned.push(badge)
      }
    })

    if (newlyEarned.length > 0) {
      const keys = newlyEarned.map(b => b.key)
      user.badges = [...(user.badges || []), ...keys]

      const bonusXP = newlyEarned.reduce((sum, b) => sum + b.xp_reward, 0)
      const newTotalXP = (user.total_xp || 0) + bonusXP
      const newTitleDef = getTitleByXP(newTotalXP)

      user.total_xp = newTotalXP
      user.current_title = newTitleDef.title
      user.current_level = newTitleDef.level
      user.updated_at = Date.now()

      MockDatabase.set('user', user)

      return {
        code: 0,
        data: {
          newly_earned: newlyEarned,
          bonus_xp: bonusXP,
          total_xp: newTotalXP,
          current_title: newTitleDef.title,
          current_level: newTitleDef.level
        }
      }
    }

    return {
      code: 0,
      data: {
        newly_earned: [],
        bonus_xp: 0,
        total_xp: user.total_xp,
        current_title: user.current_title,
        current_level: user.current_level
      }
    }
  }

  static getBadges(): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const user = MockDatabase.get<User | null>('user', null)
    if (!user) return { code: 404, msg: '用户不存在' }

    const earnedKeys = user.badges || []
    
    const earned: Badge[] = []
    const locked: Badge[] = []

    BADGE_DEFINITIONS.forEach(def => {
      const badge: Badge = {
        _id: 'badge-' + def.key,
        ...def
      }
      if (earnedKeys.includes(def.key)) {
        earned.push(badge)
      } else {
        locked.push(badge)
      }
    })

    return {
      code: 0,
      data: { earned, locked }
    }
  }

  // 4. report-generator
  static getWeeklyReport(params: any): ApiResponse {
    const reports = MockDatabase.get<WeeklyReport[]>('weekly_reports', [])
    const { week_start } = params || {}
    
    if (week_start) {
      const report = reports.find(r => r.week_start === week_start)
      return { code: 0, data: { reports: report ? [report] : [] } }
    }

    // 按时间倒序
    reports.sort((a, b) => b.week_start - a.week_start)
    return { code: 0, data: { reports } }
  }

  static getAnnualReport(params: any): ApiResponse {
    const { year } = params || {}
    if (!year) return { code: 400, msg: '缺少年份参数' }

    const sessions = MockDatabase.get<PoopSession[]>('sessions', []).filter(s => {
      return new Date(s.start_time).getFullYear() === year
    })

    if (sessions.length === 0) {
      return { code: 0, data: { report: null, msg: '当年无记录' } }
    }

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
    const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
    const totalComfort = sessions.reduce((sum, s) => sum + s.comfort_level, 0)
    const bestEarnings = Math.max(...sessions.map(s => s.earnings))

    // 按月份汇总
    const monthlyMap: { [m: number]: any } = {}
    const hourlyDist = new Array(24).fill(0)
    const daysSet = new Set<string>()

    sessions.forEach(s => {
      const d = new Date(s.start_time)
      const m = d.getMonth() + 1
      const hour = d.getHours()
      
      hourlyDist[hour]++
      daysSet.add(`${m}-${d.getDate()}`)

      if (!monthlyMap[m]) {
        monthlyMap[m] = { month: m, sessions: 0, earnings: 0, duration: 0 }
      }
      monthlyMap[m].sessions++
      monthlyMap[m].earnings += s.earnings
      monthlyMap[m].duration += s.duration_seconds
    })

    const monthlyStats = Object.values(monthlyMap).map((m: any) => ({
      ...m,
      earnings: Math.round(m.earnings * 100) / 100
    }))

    const activeDays = daysSet.size
    const peakHour = hourlyDist.indexOf(Math.max(...hourlyDist))
    
    // 购买力
    const user = MockDatabase.get<User | null>('user', null)
    const salaryHistory = user?.salary_history || []

    const report: AnnualReport = {
      year,
      total_sessions: sessions.length,
      total_duration_seconds: totalDuration,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      avg_comfort: Math.round((totalComfort / sessions.length) * 10) / 10,
      avg_daily_sessions: Math.round((sessions.length / activeDays) * 10) / 10,
      best_session_earnings: Math.round(bestEarnings * 100) / 100,
      peak_hour: peakHour,
      active_days: activeDays,
      monthly_stats: monthlyStats,
      salary_changes: salaryHistory.filter(s => new Date(s.effective_date).getFullYear() === year),
      purchasing_comparisons: getTopComparisons(totalEarnings, 5),
      hourly_distribution: hourlyDist
    }

    return { code: 0, data: { report } }
  }

  // 5. group-manager
  static createGroup(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { name } = params
    if (!name) return { code: 400, msg: '团队名称无效' }

    const groups = MockDatabase.get<Group[]>('groups', [])
    
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase()
    const newGroup: Group = {
      _id: 'group-' + Math.random().toString(36).substr(2, 9),
      name,
      creator_id: uid,
      invite_code: inviteCode,
      member_ids: [uid],
      max_members: 50,
      is_anonymous: false,
      created_at: Date.now()
    }

    groups.push(newGroup)
    MockDatabase.set('groups', groups)

    // 更新用户加入的战队
    const user = MockDatabase.get<User | null>('user', null)
    if (user) {
      user.group_ids = [...(user.group_ids || []), newGroup._id]
      MockDatabase.set('user', user)
    }

    // 创建后自动调用成就检查 (group_leader 和 first_group 徽章)
    try {
      MockServer.checkAchievements({ session: null })
    } catch (_) {}

    return { code: 0, msg: '战队创建成功', data: { group: newGroup } }
  }

  static joinGroup(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { invite_code } = params
    if (!invite_code) return { code: 400, msg: '邀请码不能为空' }

    const groups = MockDatabase.get<Group[]>('groups', [])
    const group = groups.find(g => g.invite_code.toUpperCase() === invite_code.toUpperCase())
    if (!group) return { code: 404, msg: '战队未找到或邀请码无效' }

    if (group.member_ids.includes(uid)) {
      return { code: 400, msg: '你已在战队中' }
    }

    group.member_ids.push(uid)
    MockDatabase.set('groups', groups)

    const user = MockDatabase.get<User | null>('user', null)
    if (user) {
      user.group_ids = [...(user.group_ids || []), group._id]
      MockDatabase.set('user', user)
    }

    return { code: 0, msg: `成功加入「${group.name}」`, data: { group_id: group._id, group_name: group.name } }
  }

  static leaveGroup(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { group_id } = params
    const groups = MockDatabase.get<Group[]>('groups', [])
    const groupIdx = groups.findIndex(g => g._id === group_id)
    if (groupIdx === -1) return { code: 404, msg: '团队不存在' }

    const group = groups[groupIdx]
    if (group.creator_id === uid) {
      return { code: 400, msg: '队长不能退出，请先转让队长' }
    }

    group.member_ids = group.member_ids.filter(id => id !== uid)
    MockDatabase.set('groups', groups)

    const user = MockDatabase.get<User | null>('user', null)
    if (user) {
      user.group_ids = user.group_ids.filter(id => id !== group_id)
      MockDatabase.set('user', user)
    }

    return { code: 0, msg: '已退出战队' }
  }

  static listMyGroups(): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const groups = MockDatabase.get<Group[]>('groups', [])
    const myGroups = groups.filter(g => g.member_ids.includes(uid))

    return { code: 0, data: { groups: myGroups } }
  }

  static getLeaderboard(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { group_id, period = 'week', sort_by = 'earnings' } = params
    const groups = MockDatabase.get<Group[]>('groups', [])
    const group = groups.find(g => g._id === group_id)
    if (!group) return { code: 404, msg: '战队未找到' }

    // 模拟战队成员数据
    const user = MockDatabase.get<User | null>('user', null)
    const userEarnings = user ? user.total_poop_earnings : 0
    const userDuration = user ? user.total_duration_seconds : 0
    const userSessions = user ? user.total_sessions : 0

    // mock 成员
    const teammates = [
      {
        user_id: uid,
        nickname: user?.nickname || '我',
        avatar_url: '',
        current_title: user?.current_title || '厕所实习生',
        total_earnings: period === 'week' ? Math.round(userEarnings * 0.3 * 100) / 100 : userEarnings,
        total_duration: period === 'week' ? Math.round(userDuration * 0.3) : userDuration,
        total_sessions: period === 'week' ? Math.max(1, Math.round(userSessions * 0.3)) : userSessions
      },
      {
        user_id: 'mock-teammate-1',
        nickname: '马桶总监_张三',
        avatar_url: '',
        current_title: '马桶总监',
        total_earnings: period === 'week' ? 128.5 : 458.0,
        total_duration: period === 'week' ? 5200 : 18500,
        total_sessions: period === 'week' ? 10 : 35
      },
      {
        user_id: 'mock-teammate-2',
        nickname: '拉屎小王子_李四',
        avatar_url: '',
        current_title: '如厕专员',
        total_earnings: period === 'week' ? 72.8 : 288.4,
        total_duration: period === 'week' ? 3200 : 12400,
        total_sessions: period === 'week' ? 6 : 24
      },
      {
        user_id: 'mock-teammate-3',
        nickname: '排泄主管_王五',
        avatar_url: '',
        current_title: '排泄主管',
        total_earnings: period === 'week' ? 95.0 : 355.0,
        total_duration: period === 'week' ? 4100 : 15600,
        total_sessions: period === 'week' ? 8 : 31
      }
    ]

    const sortKey = sort_by === 'duration' ? 'total_duration' : sort_by === 'sessions' ? 'total_sessions' : 'total_earnings'

    teammates.sort((a: any, b: any) => b[sortKey] - a[sortKey])
    const rankings = teammates.map((t, idx) => ({
      ...t,
      rank: idx + 1
    }))

    // 周排行榜第一名颁发 weekly_king 徽章 (匹配后端 group-manager 行为)
    if (period === 'week' && sort_by === 'earnings' && rankings.length > 0 && user && rankings[0].total_earnings > 0) {
      const topUserId = rankings[0].user_id
      if (topUserId === uid && !user.badges.includes('weekly_king')) {
        const badgeDef = BADGE_DEFINITIONS.find(b => b.key === 'weekly_king')
        if (badgeDef) {
          user.badges = [...(user.badges || []), 'weekly_king']
          const bonusXP = badgeDef.xp_reward
          const newTotalXP = (user.total_xp || 0) + bonusXP
          const newTitleDef = getTitleByXP(newTotalXP)
          user.total_xp = newTotalXP
          user.current_title = newTitleDef.title
          user.current_level = newTitleDef.level
          user.updated_at = Date.now()
          MockDatabase.set('user', user)
        }
      }
    }

    return {
      code: 0,
      data: {
        rankings: rankings as LeaderboardEntry[],
        group_name: group.name,
        period
      }
    }
  }

  static getGroupFeed(params: any): ApiResponse {
    const uid = MockDatabase.get<string | null>('current_uid', null)
    if (!uid) return { code: 401, msg: '未登录' }

    const { group_id, limit = 20 } = params
    const groups = MockDatabase.get<Group[]>('groups', [])
    const group = groups.find(g => g._id === group_id)
    if (!group) return { code: 404, msg: '战队未找到' }

    // 汇合用户自己的最近一次记录，并合并 mock Teammate 动态
    const sessions = MockDatabase.get<PoopSession[]>('sessions', [])
    const user = MockDatabase.get<User | null>('user', null)
    const latestUserSession = sessions[sessions.length - 1]

    const now = Date.now()
    const feed = [
      {
        user_id: 'mock-teammate-1',
        display_name: '马桶总监_张三',
        earnings: 14.50,
        duration_seconds: 680,
        feedback_type: 'praise',
        created_at: now - 15 * 60 * 1000 // 15分钟前
      },
      {
        user_id: 'mock-teammate-3',
        display_name: '排泄主管_王五',
        earnings: 9.80,
        duration_seconds: 420,
        feedback_type: 'normal',
        created_at: now - 2 * 3600 * 1000 // 2小时前
      },
      {
        user_id: 'mock-teammate-2',
        display_name: '拉屎小王子_李四',
        earnings: 3.20,
        duration_seconds: 150,
        feedback_type: 'encourage',
        created_at: now - 5 * 3600 * 1000 // 5小时前
      }
    ]

    if (latestUserSession) {
      feed.unshift({
        user_id: uid,
        display_name: user?.nickname || '我',
        earnings: latestUserSession.earnings,
        duration_seconds: latestUserSession.duration_seconds,
        feedback_type: latestUserSession.feedback_type,
        created_at: latestUserSession.start_time
      })
    }

    feed.sort((a, b) => b.created_at - a.created_at)

    return {
      code: 0,
      data: {
        feed: feed.slice(0, limit)
      }
    }
  }
}

// 统一的 API 客户端接口
// 控制开关: true=使用本地Mock数据库, false=连真实uniCloud后端
const USE_MOCK = false

export async function apiCall<T = any>(
  name: string,
  action: string,
  params: any = {}
): Promise<ApiResponse<T>> {
  // 检查是否具备可运行的真实 uniCloud 环境并请求云函数
  const isUniCloudValid = !USE_MOCK && typeof uniCloud !== 'undefined' && uniCloud.callFunction
  
  if (isUniCloudValid) {
    try {
      // 自动注入 userId（从本地存储获取已登录用户ID）
      const uid = MockDatabase.get<string | null>('current_uid', null)
      const callParams = uid ? { ...params, userId: uid } : params
      console.log(`[uniCloud Client] calling ${name}.${action} with params:`, callParams)
      const res = await uniCloud.callFunction({
        name,
        data: { action, params: callParams }
      })
      const result = res.result as ApiResponse<T>
      if (result && result.code !== undefined) {
        return result
      }
      return { code: 0, data: res.result as any }
    } catch (e: any) {
      console.warn(`[uniCloud Fallback] 云函数 ${name}.${action} 调用失败，正在降级至本地 LocalStorage 存储引擎. 异常原因:`, e.message || e)
    }
  }

  // 本地 Mock DB 处理路由逻辑
  return new Promise((resolve) => {
    setTimeout(() => {
      let response: ApiResponse = { code: 400, msg: `未知操作 ${name}.${action}` }

      try {
        if (name === 'user-center') {
          switch (action) {
            case 'register':
              response = MockServer.register(params)
              break
            case 'getProfile':
              response = MockServer.getProfile()
              break
            case 'updateSalary':
              response = MockServer.updateSalary(params)
              break
            case 'getSalaryHistory':
              response = MockServer.getSalaryHistory()
              break
            case 'updateSettings':
              response = MockServer.updateSettings(params)
              break
          }
        } else if (name === 'session-manager') {
          switch (action) {
            case 'create':
              response = MockServer.createSession(params)
              break
            case 'list':
              response = MockServer.listSessions(params)
              break
            case 'stats':
              response = MockServer.getStats(params)
              break
            case 'dailyStats':
              response = MockServer.getDailyStats(params)
              break
            case 'detail':
              response = MockServer.getDetail(params)
              break
          }
        } else if (name === 'achievement-checker') {
          switch (action) {
            case 'check':
              response = MockServer.checkAchievements(params)
              break
            case 'getBadges':
              response = MockServer.getBadges()
              break
          }
        } else if (name === 'report-generator') {
          switch (action) {
            case 'getWeeklyReport':
              response = MockServer.getWeeklyReport(params)
              break
            case 'getAnnualReport':
              response = MockServer.getAnnualReport(params)
              break
          }
        } else if (name === 'group-manager') {
          switch (action) {
            case 'create':
              response = MockServer.createGroup(params)
              break
            case 'join':
              response = MockServer.joinGroup(params)
              break
            case 'leave':
              response = MockServer.leaveGroup(params)
              break
            case 'list':
              response = MockServer.listMyGroups()
              break
            case 'leaderboard':
              response = MockServer.getLeaderboard(params)
              break
            case 'feed':
              response = MockServer.getGroupFeed(params)
              break
          }
        }
      } catch (err: any) {
        response = { code: 500, msg: `MockServer 内部执行错误: ${err.message}` }
      }

      console.log(`[MockServer Response] ${name}.${action} ->`, response)
      resolve(response)
    }, 150) // 模拟延迟
  })
}

// 开发调试清理功能
export function resetMockDatabase() {
  MockDatabase.clear()
}
