'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const reportsCollection = db.collection('weekly-reports')
const groupsCollection = db.collection('groups')
const { getAuthUid, getWeekMondayCN, getDateStringCN, getHourCN } = require('../../common/utils')
const { PURCHASE_ITEMS } = require('../../common/badge-definitions')

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
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }
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

  const rankInGroups = await _calcGroupRanks(uid, weekStart, weekEnd)

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
    rank_in_groups: rankInGroups,
    generated_at: Date.now(),
  }

  const result = await reportsCollection.add(report)
  report._id = result.id

  return { code: 0, data: { report } }
}

async function _calcGroupRanks(uid, weekStart, weekEnd) {
  const userRes = await usersCollection.doc(uid).field({ group_ids: true }).get()
  const groupIds = userRes.data?.[0]?.group_ids || []
  if (groupIds.length === 0) return []

  const groupsRes = await groupsCollection.where({ _id: dbCmd.in(groupIds) }).field({ _id: true, name: true, member_ids: true }).get()
  const ranks = []

  for (const group of groupsRes.data) {
    const allSessions = await sessionsCollection
      .where({ user_id: dbCmd.in(group.member_ids), start_time: dbCmd.gte(weekStart).and(dbCmd.lte(weekEnd)) })
      .get()

    const earningsMap = {}
    group.member_ids.forEach(mid => { earningsMap[mid] = 0 })
    allSessions.data.forEach(s => {
      if (earningsMap[s.user_id] !== undefined) earningsMap[s.user_id] += s.earnings
    })

    const sorted = Object.entries(earningsMap).sort((a, b) => b[1] - a[1])
    const myIndex = sorted.findIndex(([mid]) => mid === uid)

    ranks.push({
      group_id: group._id,
      group_name: group.name,
      rank: myIndex + 1,
      total_members: group.member_ids.length,
      my_earnings: Math.round((earningsMap[uid] || 0) * 100) / 100,
    })
  }

  return ranks
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
    const dateStr = getDateStringCN(s.start_time)
    const month = parseInt(dateStr.split('-')[1], 10)
    if (!monthlyStats[month]) monthlyStats[month] = { month, sessions: 0, earnings: 0, duration: 0 }
    monthlyStats[month].sessions++
    monthlyStats[month].earnings += s.earnings
    monthlyStats[month].duration += s.duration_seconds
    hourlyDist[getHourCN(s.start_time)]++
    activeDays.add(dateStr)
  })

  const peakHour = hourlyDist.indexOf(Math.max(...hourlyDist))

  const userRes = await usersCollection.doc(uid).field({ salary_history: true }).get()
  const salaryHistory = (userRes.data?.[0]?.salary_history || [])
    .filter(s => {
      const d = getDateStringCN(s.effective_date)
      return d.startsWith(String(year))
    })

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
