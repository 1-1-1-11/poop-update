'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const reportsCollection = db.collection('weekly-reports')
const { calculateEarnings } = require('../../common/salary-calc')

const PURCHASE_ITEMS = [
  { name: '瑞幸咖啡', price: 9.9, icon: 'coffee' },
  { name: '蜜雪冰城', price: 4, icon: 'ice-cream' },
  { name: '奶茶', price: 15, icon: 'bubble-tea' },
  { name: '煎饼果子', price: 8, icon: 'pancake' },
  { name: '外卖一顿饭', price: 25, icon: 'takeout' },
  { name: '电影票', price: 35, icon: 'movie' },
]

exports.main = async (event, context) => {
  const { action, params } = event

  switch (action) {
    case 'generateWeekly':
      return await generateWeeklyForUser(params, context)
    case 'generateWeeklyAll':
      return await generateWeeklyAll(context)
    case 'getWeeklyReport':
      return await getWeeklyReport(params, context)
    case 'getAnnualReport':
      return await getAnnualReport(params, context)
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function generateWeeklyForUser(params, context) {
  const uid = params.user_id || (context.CLIENTINFO && context.CLIENTINFO.uid)
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { week_start } = params
  if (!week_start) {
    return { code: 400, msg: '缺少周起始时间' }
  }

  const weekEnd = week_start + 7 * 86400000 - 1

  const existing = await reportsCollection
    .where({ user_id: uid, week_start })
    .limit(1)
    .get()

  if (existing.data && existing.data.length > 0) {
    return { code: 0, data: { report: existing.data[0] } }
  }

  const sessionsRes = await sessionsCollection
    .where({
      user_id: uid,
      start_time: dbCmd.gte(week_start).and(dbCmd.lte(weekEnd)),
    })
    .get()

  const sessions = sessionsRes.data

  if (sessions.length === 0) {
    return { code: 0, data: { report: null, msg: '本周无如厕记录' } }
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
  const totalComfort = sessions.reduce((sum, s) => sum + s.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(s => s.earnings))

  const comparisons = PURCHASE_ITEMS
    .map(item => ({
      item_name: item.name,
      item_price: item.price,
      quantity_affordable: Math.floor((totalEarnings / item.price) * 10) / 10,
      icon: item.icon,
    }))
    .filter(c => c.quantity_affordable >= 0.1)
    .sort((a, b) => b.quantity_affordable - a.quantity_affordable)
    .slice(0, 4)

  const report = {
    user_id: uid,
    week_start,
    week_end: weekEnd,
    total_sessions: sessions.length,
    total_duration_seconds: totalDuration,
    total_earnings: Math.round(totalEarnings * 100) / 100,
    avg_comfort: Math.round((totalComfort / sessions.length) * 10) / 10,
    best_session_earnings: Math.round(bestEarnings * 100) / 100,
    purchasing_comparisons: comparisons,
    rank_in_groups: [],
    generated_at: Date.now(),
  }

  const result = await reportsCollection.add(report)
  report._id = result.id

  return { code: 0, data: { report } }
}

async function generateWeeklyAll(context) {
  const now = Date.now()
  const dayOfWeek = new Date(now).getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(now)
  lastMonday.setDate(lastMonday.getDate() - mondayOffset - 7)
  lastMonday.setHours(0, 0, 0, 0)
  const weekStart = lastMonday.getTime()

  const usersRes = await usersCollection
    .where({ 'settings.weekly_report_push': true })
    .field({ _id: true })
    .get()

  let generated = 0
  for (const user of usersRes.data) {
    try {
      await generateWeeklyForUser(
        { user_id: user._id, week_start: weekStart },
        context
      )
      generated++
    } catch (e) {
      console.error(`生成周报失败 user=${user._id}`, e)
    }
  }

  return { code: 0, data: { generated, total_users: usersRes.data.length } }
}

async function getWeeklyReport(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { week_start } = params || {}

  let query = reportsCollection.where({ user_id: uid })
  if (week_start) {
    query = reportsCollection.where({ user_id: uid, week_start })
  }

  const result = await query.orderBy('week_start', 'desc').limit(10).get()

  return { code: 0, data: { reports: result.data } }
}

async function getAnnualReport(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { year } = params
  if (!year) {
    return { code: 400, msg: '缺少年份参数' }
  }

  const yearStart = new Date(year, 0, 1).getTime()
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime()

  const sessionsRes = await sessionsCollection
    .where({
      user_id: uid,
      start_time: dbCmd.gte(yearStart).and(dbCmd.lte(yearEnd)),
    })
    .get()

  const sessions = sessionsRes.data

  if (sessions.length === 0) {
    return { code: 0, data: { report: null, msg: `${year}年无如厕记录` } }
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
  const totalComfort = sessions.reduce((sum, s) => sum + s.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(s => s.earnings))

  const monthlyStats = {}
  sessions.forEach(s => {
    const month = new Date(s.start_time).getMonth() + 1
    if (!monthlyStats[month]) {
      monthlyStats[month] = { month, sessions: 0, earnings: 0, duration: 0 }
    }
    monthlyStats[month].sessions++
    monthlyStats[month].earnings += s.earnings
    monthlyStats[month].duration += s.duration_seconds
  })

  const hourlyDist = new Array(24).fill(0)
  sessions.forEach(s => {
    hourlyDist[new Date(s.start_time).getHours()]++
  })
  const peakHour = hourlyDist.indexOf(Math.max(...hourlyDist))

  const userRes = await usersCollection.doc(uid).field({ salary_history: true }).get()
  const salaryHistory = (userRes.data && userRes.data[0] && userRes.data[0].salary_history) || []
  const yearSalaryChanges = salaryHistory.filter(s => {
    const d = new Date(s.effective_date)
    return d.getFullYear() === year
  })

  const activeDays = new Set(sessions.map(s => {
    const d = new Date(s.start_time)
    return `${d.getMonth() + 1}-${d.getDate()}`
  })).size

  const comparisons = PURCHASE_ITEMS
    .map(item => ({
      item_name: item.name,
      item_price: item.price,
      quantity_affordable: Math.floor((totalEarnings / item.price) * 10) / 10,
      icon: item.icon,
    }))
    .filter(c => c.quantity_affordable >= 1)
    .sort((a, b) => b.item_price - a.item_price)
    .slice(0, 5)

  return {
    code: 0,
    data: {
      report: {
        year,
        total_sessions: sessions.length,
        total_duration_seconds: totalDuration,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        avg_comfort: Math.round((totalComfort / sessions.length) * 10) / 10,
        avg_daily_sessions: Math.round((sessions.length / activeDays) * 10) / 10,
        best_session_earnings: Math.round(bestEarnings * 100) / 100,
        peak_hour: peakHour,
        active_days: activeDays,
        monthly_stats: Object.values(monthlyStats).map(m => ({
          ...m,
          earnings: Math.round(m.earnings * 100) / 100,
        })),
        salary_changes: yearSalaryChanges,
        purchasing_comparisons: comparisons,
        hourly_distribution: hourlyDist,
      },
    },
  }
}
