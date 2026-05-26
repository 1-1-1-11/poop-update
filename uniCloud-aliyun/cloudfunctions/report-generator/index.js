'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const reportsCollection = db.collection('weekly-reports')
const { getAuthUid, getWeekMondayCN, getDateStringCN, getHourCN } = require('../../common/utils')

const PURCHASE_ITEMS = [
  { name: '瑞幸咖啡', price: 9.9, icon: 'coffee' },
  { name: '蜜雪冰城', price: 4, icon: 'ice-cream' },
  { name: '奶茶', price: 15, icon: 'bubble-tea' },
  { name: '煎饼果子', price: 8, icon: 'pancake' },
  { name: '包子', price: 2, icon: 'bao' },
  { name: '地铁票', price: 3, icon: 'metro' },
  { name: '可乐', price: 3.5, icon: 'cola' },
  { name: '矿泉水', price: 2, icon: 'water' },
  { name: '方便面', price: 5, icon: 'noodle' },
  { name: '视频会员日卡', price: 6, icon: 'vip' },
  { name: '麦当劳巨无霸', price: 25, icon: 'burger' },
  { name: '电影票', price: 35, icon: 'movie' },
  { name: '外卖一顿饭', price: 25, icon: 'takeout' },
  { name: 'AJ球鞋', price: 1299, icon: 'sneaker' },
  { name: 'Switch游戏', price: 299, icon: 'game' },
  { name: 'iPhone', price: 7999, icon: 'phone' },
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

async function generateWeeklyForUser(params, context, callerUid) {
  const uid = callerUid || null

  if (!uid) {
    const auth = await getAuthUid(context)
    if (!auth.uid) return { code: 401, msg: auth.errMsg }
    return await _generateReport(auth.uid, params.week_start)
  }

  return await _generateReport(uid, params.week_start)
}

async function _generateReport(uid, weekStart) {
  if (!weekStart) return { code: 400, msg: '缺少周起始时间' }

  const weekEnd = weekStart + 7 * 86400000 - 1

  const existing = await reportsCollection.where({ user_id: uid, week_start: weekStart }).limit(1).get()
  if (existing.data && existing.data.length > 0) {
    return { code: 0, data: { report: existing.data[0] } }
  }

  const sessionsRes = await sessionsCollection
    .where({ user_id: uid, start_time: dbCmd.gte(weekStart).and(dbCmd.lte(weekEnd)) })
    .get()

  if (sessionsRes.data.length === 0) {
    return { code: 0, data: { report: null, msg: '本周无如厕记录' } }
  }

  const sessions = sessionsRes.data
  const totalDuration = sessions.reduce((s, r) => s + r.duration_seconds, 0)
  const totalEarnings = sessions.reduce((s, r) => s + r.earnings, 0)
  const totalComfort = sessions.reduce((s, r) => s + r.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(r => r.earnings))

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
    week_start: weekStart,
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

async function generateWeeklyAll() {
  const now = Date.now()
  const lastMonday = getWeekMondayCN(now - 7 * 86400000)

  const usersRes = await usersCollection
    .where({ 'settings.weekly_report_push': true })
    .field({ _id: true })
    .get()

  let generated = 0
  for (const user of usersRes.data) {
    try {
      await _generateReport(user._id, lastMonday)
      generated++
    } catch (e) {
      console.error(`生成周报失败 user=${user._id}`, e)
    }
  }

  return { code: 0, data: { generated, total_users: usersRes.data.length } }
}

async function getWeeklyReport(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { week_start } = params || {}
  const where = { user_id: uid }
  if (week_start) where.week_start = week_start

  const result = await reportsCollection.where(where).orderBy('week_start', 'desc').limit(10).get()
  return { code: 0, data: { reports: result.data } }
}

async function getAnnualReport(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { year } = params
  if (!year || !Number.isInteger(year)) return { code: 400, msg: '请提供有效年份' }

  const yearStart = new Date(`${year}-01-01T00:00:00+08:00`).getTime()
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00+08:00`).getTime() - 1

  const sessionsRes = await sessionsCollection
    .where({ user_id: uid, start_time: dbCmd.gte(yearStart).and(dbCmd.lte(yearEnd)) })
    .get()

  const sessions = sessionsRes.data
  if (sessions.length === 0) {
    return { code: 0, data: { report: null, msg: `${year}年无如厕记录` } }
  }

  const totalDuration = sessions.reduce((s, r) => s + r.duration_seconds, 0)
  const totalEarnings = sessions.reduce((s, r) => s + r.earnings, 0)
  const totalComfort = sessions.reduce((s, r) => s + r.comfort_level, 0)
  const bestEarnings = Math.max(...sessions.map(r => r.earnings))

  const monthlyStats = {}
  const hourlyDist = new Array(24).fill(0)
  const activeDays = new Set()

  sessions.forEach(s => {
    const d = new Date(s.start_time)
    const month = d.getMonth() + 1
    if (!monthlyStats[month]) monthlyStats[month] = { month, sessions: 0, earnings: 0, duration: 0 }
    monthlyStats[month].sessions++
    monthlyStats[month].earnings += s.earnings
    monthlyStats[month].duration += s.duration_seconds
    hourlyDist[getHourCN(s.start_time)]++
    activeDays.add(getDateStringCN(s.start_time))
  })

  const peakHour = hourlyDist.indexOf(Math.max(...hourlyDist))

  const userRes = await usersCollection.doc(uid).field({ salary_history: true }).get()
  const salaryHistory = (userRes.data?.[0]?.salary_history || [])
    .filter(s => new Date(s.effective_date).getFullYear() === year)

  const comparisons = PURCHASE_ITEMS
    .map(item => ({ item_name: item.name, item_price: item.price, quantity_affordable: Math.floor((totalEarnings / item.price) * 10) / 10, icon: item.icon }))
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
        avg_daily_sessions: Math.round((sessions.length / activeDays.size) * 10) / 10,
        best_session_earnings: Math.round(bestEarnings * 100) / 100,
        peak_hour: peakHour,
        active_days: activeDays.size,
        monthly_stats: Object.values(monthlyStats).map(m => ({ ...m, earnings: Math.round(m.earnings * 100) / 100 })),
        salary_changes: salaryHistory,
        purchasing_comparisons: comparisons,
        hourly_distribution: hourlyDist,
      },
    },
  }
}
