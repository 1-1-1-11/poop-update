'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const sessionsCollection = db.collection('poop-sessions')
const usersCollection = db.collection('users')
const { calculateEarnings, getFeedbackType, calculateSessionXP, getTitleByXP } = require('../../common/salary-calc')

exports.main = async (event, context) => {
  const { action, params } = event

  switch (action) {
    case 'create':
      return await createSession(params, context)
    case 'list':
      return await listSessions(params, context)
    case 'stats':
      return await getStats(params, context)
    case 'detail':
      return await getDetail(params, context)
    case 'dailyStats':
      return await getDailyStats(params, context)
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function createSession(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { start_time, end_time, comfort_level, note } = params

  if (!start_time || !end_time || !comfort_level) {
    return { code: 400, msg: '开始时间、结束时间和舒适度为必填' }
  }

  if (comfort_level < 1 || comfort_level > 5) {
    return { code: 400, msg: '舒适度范围: 1-5' }
  }

  if (end_time <= start_time) {
    return { code: 400, msg: '结束时间必须大于开始时间' }
  }

  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { code: 404, msg: '用户不存在' }
  }

  const user = userRes.data[0]
  const durationSeconds = Math.round((end_time - start_time) / 1000)

  if (durationSeconds < 1) {
    return { code: 400, msg: '如厕时长太短' }
  }

  if (durationSeconds > 7200) {
    return { code: 400, msg: '单次如厕不能超过2小时' }
  }

  const earnings = calculateEarnings(
    user.monthly_salary,
    durationSeconds,
    user.work_days_per_month,
    user.work_hours_per_day
  )

  const feedbackType = getFeedbackType(durationSeconds)

  const hasStreak = await checkStreak(uid, start_time)
  const xpEarned = calculateSessionXP(durationSeconds, comfort_level, hasStreak)

  const now = Date.now()
  const session = {
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
    is_work_hours: isWorkHours(new Date(start_time)),
    created_at: now,
  }

  const result = await sessionsCollection.add(session)
  session._id = result.id

  const newTotalXP = (user.total_xp || 0) + xpEarned
  const newTitle = getTitleByXP(newTotalXP)
  const leveledUp = newTitle.level > (user.current_level || 1)

  const today = getDateString(start_time)
  const lastSessionDate = user.last_session_date || ''
  const yesterday = getDateString(start_time - 86400000)

  let newStreakDays = user.streak_days || 0
  if (lastSessionDate === yesterday) {
    newStreakDays += 1
  } else if (lastSessionDate !== today) {
    newStreakDays = 1
  }

  await usersCollection.doc(uid).update({
    total_xp: newTotalXP,
    total_poop_earnings: (user.total_poop_earnings || 0) + earnings,
    total_sessions: (user.total_sessions || 0) + 1,
    total_duration_seconds: (user.total_duration_seconds || 0) + durationSeconds,
    current_title: newTitle.title,
    current_level: newTitle.level,
    streak_days: newStreakDays,
    last_session_date: today,
    updated_at: now,
  })

  return {
    code: 0,
    msg: '记录成功',
    data: {
      session,
      feedback_type: feedbackType,
      xp_earned: xpEarned,
      total_xp: newTotalXP,
      current_level: newTitle.level,
      current_title: newTitle.title,
      leveled_up: leveledUp,
      streak_days: newStreakDays,
    },
  }
}

async function listSessions(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { page = 1, limit = 20, date_start, date_end } = params || {}
  const skip = (page - 1) * limit

  let query = sessionsCollection.where({ user_id: uid })

  if (date_start && date_end) {
    query = sessionsCollection.where({
      user_id: uid,
      start_time: dbCmd.gte(date_start).and(dbCmd.lte(date_end)),
    })
  }

  const countRes = await query.count()
  const total = countRes.total

  const listRes = await query
    .orderBy('start_time', 'desc')
    .skip(skip)
    .limit(Math.min(limit, 50))
    .get()

  return {
    code: 0,
    data: {
      sessions: listRes.data,
      total,
      page,
      limit,
      has_more: skip + listRes.data.length < total,
    },
  }
}

async function getStats(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { period = 'week' } = params || {}
  const now = Date.now()
  let startTime

  switch (period) {
    case 'week':
      startTime = now - 7 * 86400000
      break
    case 'month':
      startTime = now - 30 * 86400000
      break
    case 'year':
      startTime = now - 365 * 86400000
      break
    case 'all':
      startTime = 0
      break
    default:
      startTime = now - 7 * 86400000
  }

  const sessionsRes = await sessionsCollection
    .where({
      user_id: uid,
      start_time: dbCmd.gte(startTime),
    })
    .get()

  const sessions = sessionsRes.data

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
        comfort_trend: [],
      },
    }
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
  const totalComfort = sessions.reduce((sum, s) => sum + s.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(s => s.earnings))

  const hourlyDist = new Array(24).fill(0)
  const dailyMap = {}

  sessions.forEach(s => {
    const date = new Date(s.start_time)
    const hour = date.getHours()
    hourlyDist[hour]++

    const dateStr = getDateString(s.start_time)
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, sessions: 0, earnings: 0, duration: 0, avg_comfort: 0, comfort_sum: 0 }
    }
    dailyMap[dateStr].sessions++
    dailyMap[dateStr].earnings += s.earnings
    dailyMap[dateStr].duration += s.duration_seconds
    dailyMap[dateStr].comfort_sum += s.comfort_level
  })

  const dailyDistribution = Object.values(dailyMap)
    .map(d => ({
      ...d,
      avg_comfort: Math.round((d.comfort_sum / d.sessions) * 10) / 10,
      earnings: Math.round(d.earnings * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const comfortTrend = dailyDistribution.map(d => ({
    date: d.date,
    avg_comfort: d.avg_comfort,
  }))

  return {
    code: 0,
    data: {
      period,
      total_sessions: sessions.length,
      total_duration_seconds: totalDuration,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      avg_duration_seconds: Math.round(totalDuration / sessions.length),
      avg_comfort: Math.round((totalComfort / sessions.length) * 10) / 10,
      avg_earnings: Math.round((totalEarnings / sessions.length) * 100) / 100,
      best_session_earnings: Math.round(bestEarnings * 100) / 100,
      daily_distribution: dailyDistribution,
      hourly_distribution: hourlyDist,
      comfort_trend: comfortTrend,
    },
  }
}

async function getDetail(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { session_id } = params
  if (!session_id) {
    return { code: 400, msg: '缺少记录ID' }
  }

  const result = await sessionsCollection.doc(session_id).get()
  if (!result.data || result.data.length === 0) {
    return { code: 404, msg: '记录不存在' }
  }

  const session = result.data[0]
  if (session.user_id !== uid) {
    return { code: 403, msg: '无权查看' }
  }

  return { code: 0, data: { session } }
}

async function getDailyStats(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { year, month } = params || {}
  if (!year || !month) {
    return { code: 400, msg: '年份和月份为必填' }
  }

  const startDate = new Date(year, month - 1, 1).getTime()
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()

  const sessionsRes = await sessionsCollection
    .where({
      user_id: uid,
      start_time: dbCmd.gte(startDate).and(dbCmd.lte(endDate)),
    })
    .get()

  const dailyMap = {}
  sessionsRes.data.forEach(s => {
    const dateStr = getDateString(s.start_time)
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, count: 0, earnings: 0, duration: 0 }
    }
    dailyMap[dateStr].count++
    dailyMap[dateStr].earnings += s.earnings
    dailyMap[dateStr].duration += s.duration_seconds
  })

  return {
    code: 0,
    data: {
      year,
      month,
      days: Object.values(dailyMap).map(d => ({
        ...d,
        earnings: Math.round(d.earnings * 100) / 100,
      })),
    },
  }
}

// --- 辅助函数 ---

async function checkStreak(uid, sessionTime) {
  const yesterday = getDateString(sessionTime - 86400000)
  const todayStr = getDateString(sessionTime)

  const res = await sessionsCollection
    .where({
      user_id: uid,
      created_at: dbCmd.gte(new Date(yesterday).getTime()),
    })
    .limit(1)
    .get()

  return res.data.length > 0
}

function getDateString(timestamp) {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isWorkHours(date) {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  const hour = date.getHours()
  return hour >= 9 && hour < 18
}
