'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const sessionsCollection = db.collection('poop-sessions')
const usersCollection = db.collection('users')
const { calculateEarnings, getFeedbackType, calculateSessionXP, getTitleByXP } = require('../../common/salary-calc')
const { getAuthUid, getDateStringCN, getDayStartCN, getDayEndCN, isWorkHoursCN, getHourCN } = require('../../common/utils')
const { validateSessionParams } = require('../../common/validators')

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
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { start_time, end_time, comfort_level, note } = params

  const validation = validateSessionParams(params)
  if (!validation.valid) return { code: 400, msg: validation.msg }
  const durationSeconds = validation.durationSeconds

  const now = Date.now()
  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { code: 404, msg: '用户不存在' }
  }

  const user = userRes.data[0]

  if (user.work_days_per_month < 1 || user.work_hours_per_day < 1) {
    return { code: 400, msg: '请先设置有效的工作天数和工时' }
  }

  const earnings = calculateEarnings(
    user.monthly_salary, durationSeconds,
    user.work_days_per_month, user.work_hours_per_day
  )
  const feedbackType = getFeedbackType(durationSeconds)

  const todayStr = getDateStringCN(start_time)
  const yesterdayStr = getDateStringCN(start_time - 86400000)
  const lastSessionDate = user.last_session_date || ''

  let hasStreak = false
  if (lastSessionDate === todayStr || lastSessionDate === yesterdayStr) {
    hasStreak = true
  }

  const xpEarned = calculateSessionXP(durationSeconds, comfort_level, hasStreak)

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
    note: (note || '').slice(0, 200),
    is_work_hours: isWorkHoursCN(start_time),
    created_at: now,
  }

  const result = await sessionsCollection.add(session)
  session._id = result.id

  const newTotalXP = (user.total_xp || 0) + xpEarned
  const newTitle = getTitleByXP(newTotalXP)
  const leveledUp = newTitle.level > (user.current_level || 1)

  let newStreakDays = user.streak_days || 0
  if (lastSessionDate === yesterdayStr) {
    newStreakDays += 1
  } else if (lastSessionDate !== todayStr) {
    newStreakDays = 1
  }

  await usersCollection.doc(uid).update({
    total_xp: dbCmd.inc(xpEarned),
    total_poop_earnings: dbCmd.inc(earnings),
    total_sessions: dbCmd.inc(1),
    total_duration_seconds: dbCmd.inc(durationSeconds),
    current_title: newTitle.title,
    current_level: newTitle.level,
    streak_days: newStreakDays,
    last_session_date: todayStr,
    updated_at: now,
  })

  let achievementResult = null
  try {
    const achievementChecker = require('../achievement-checker/index')
    const achRes = await achievementChecker._checkForUser(uid, { session })
    if (achRes.code === 0 && achRes.data.newly_earned.length > 0) {
      achievementResult = achRes.data
    }
  } catch (e) {
    console.error('成就检测失败', e)
  }

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
      achievements: achievementResult,
    },
  }
}

async function listSessions(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { page = 1, limit = 20, date_start, date_end } = params || {}
  const skip = (page - 1) * Math.min(limit, 50)

  const where = { user_id: uid }
  if (date_start && date_end) {
    where.start_time = dbCmd.gte(date_start).and(dbCmd.lte(date_end))
  }

  const countRes = await sessionsCollection.where(where).count()
  const listRes = await sessionsCollection
    .where(where)
    .orderBy('start_time', 'desc')
    .skip(skip)
    .limit(Math.min(limit, 50))
    .get()

  return {
    code: 0,
    data: {
      sessions: listRes.data,
      total: countRes.total,
      page,
      limit,
      has_more: skip + listRes.data.length < countRes.total,
    },
  }
}

async function getStats(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { period = 'week' } = params || {}
  const now = Date.now()
  let startTime
  switch (period) {
    case 'week': startTime = now - 7 * 86400000; break
    case 'month': startTime = now - 30 * 86400000; break
    case 'year': startTime = now - 365 * 86400000; break
    case 'all': startTime = 0; break
    default: startTime = now - 7 * 86400000
  }

  const sessionsRes = await sessionsCollection
    .where({ user_id: uid, start_time: dbCmd.gte(startTime) })
    .get()
  const sessions = sessionsRes.data

  if (sessions.length === 0) {
    return {
      code: 0,
      data: {
        period, total_sessions: 0, total_duration_seconds: 0, total_earnings: 0,
        avg_duration_seconds: 0, avg_comfort: 0, avg_earnings: 0, best_session_earnings: 0,
        daily_distribution: [], hourly_distribution: new Array(24).fill(0), comfort_trend: [],
      },
    }
  }

  const totalDuration = sessions.reduce((s, r) => s + r.duration_seconds, 0)
  const totalEarnings = sessions.reduce((s, r) => s + r.earnings, 0)
  const totalComfort = sessions.reduce((s, r) => s + r.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(r => r.earnings))

  const hourlyDist = new Array(24).fill(0)
  const dailyMap = {}

  sessions.forEach(s => {
    hourlyDist[getHourCN(s.start_time)]++
    const dateStr = getDateStringCN(s.start_time)
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, sessions: 0, earnings: 0, duration: 0, comfort_sum: 0 }
    }
    dailyMap[dateStr].sessions++
    dailyMap[dateStr].earnings += s.earnings
    dailyMap[dateStr].duration += s.duration_seconds
    dailyMap[dateStr].comfort_sum += s.comfort_level
  })

  const dailyDistribution = Object.values(dailyMap)
    .map(d => ({
      date: d.date,
      sessions: d.sessions,
      earnings: Math.round(d.earnings * 100) / 100,
      duration: d.duration,
      avg_comfort: Math.round((d.comfort_sum / d.sessions) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

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
      comfort_trend: dailyDistribution.map(d => ({ date: d.date, avg_comfort: d.avg_comfort })),
    },
  }
}

async function getDetail(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { session_id } = params
  if (!session_id) return { code: 400, msg: '缺少记录ID' }

  const result = await sessionsCollection.doc(session_id).get()
  if (!result.data || result.data.length === 0) return { code: 404, msg: '记录不存在' }

  const session = result.data[0]
  if (session.user_id !== uid) return { code: 403, msg: '无权查看' }

  return { code: 0, data: { session } }
}

async function getDailyStats(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { year, month } = params || {}
  if (!year || !month || month < 1 || month > 12 || !Number.isInteger(year) || !Number.isInteger(month)) {
    return { code: 400, msg: '请提供有效的年份和月份(1-12)' }
  }

  const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`).getTime()
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const endDate = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+08:00`).getTime() - 1

  const sessionsRes = await sessionsCollection
    .where({ user_id: uid, start_time: dbCmd.gte(startDate).and(dbCmd.lte(endDate)) })
    .get()

  const dailyMap = {}
  sessionsRes.data.forEach(s => {
    const dateStr = getDateStringCN(s.start_time)
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
      year, month,
      days: Object.values(dailyMap).map(d => ({ ...d, earnings: Math.round(d.earnings * 100) / 100 })),
    },
  }
}
