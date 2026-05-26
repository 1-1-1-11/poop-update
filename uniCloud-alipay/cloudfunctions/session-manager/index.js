'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const sessionsCollection = db.collection('poop-sessions')
const usersCollection = db.collection('users')

const TITLE_LEVELS = [
  { level: 1, title: '厕所实习生', minXP: 0 },
  { level: 2, title: '如厕专员', minXP: 100 },
  { level: 3, title: '排泄主管', minXP: 500 },
  { level: 4, title: '便便经理', minXP: 1500 },
  { level: 5, title: '马桶总监', minXP: 5000 },
  { level: 6, title: '茅房VP', minXP: 15000 },
  { level: 7, title: '厕神CEO', minXP: 50000 },
]
function getTitleByXP(totalXP) {
  for (let i = TITLE_LEVELS.length - 1; i >= 0; i--)
    if (totalXP >= TITLE_LEVELS[i].minXP) return TITLE_LEVELS[i]
  return TITLE_LEVELS[0]
}
function calculateEarnings(monthlySalary, durationSeconds, workDaysPerMonth, workHoursPerDay) {
  return Math.round(((monthlySalary / workDaysPerMonth / workHoursPerDay) / 3600) * durationSeconds * 100) / 100
}
function getFeedbackType(durationSeconds) {
  const m = durationSeconds / 60
  return m >= 10 ? 'praise' : m >= 5 ? 'normal' : 'encourage'
}
function calculateSessionXP(durationSeconds, comfortLevel, hasStreak) {
  return 10 + Math.floor(durationSeconds / 60) + comfortLevel * 2 + (hasStreak ? 5 : 0)
}

const CHINA_TZ_OFFSET = 8 * 3600000
function getUid(params) { return params.userId }
function beijing(t) { return new Date((t || Date.now()) + CHINA_TZ_OFFSET) }
function dateStr(t) {
  const d = beijing(t)
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
}
function hourCN(t) { return beijing(t).getUTCHours() }
function isWorkHours(t) {
  const d = beijing(t)
  return d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && d.getUTCHours() >= 9 && d.getUTCHours() < 18
}
function dayStartCN(t) { return new Date(dateStr(t) + 'T00:00:00+08:00').getTime() }
function dayEndCN(t) { return dayStartCN(t) + 86400000 - 1 }

function validateSession(params) {
  const { start_time, end_time, comfort_level } = params
  if (!start_time || !end_time || comfort_level === undefined) return { valid: false, msg: '开始时间、结束时间和舒适度为必填' }
  if (!Number.isInteger(comfort_level) || comfort_level < 1 || comfort_level > 5) return { valid: false, msg: '舒适度范围: 1-5' }
  if (end_time <= start_time) return { valid: false, msg: '结束时间必须大于开始时间' }
  if (start_time > Date.now() + 60000) return { valid: false, msg: '不能提交未来的如厕记录' }
  const d = Math.round((end_time - start_time) / 1000)
  if (d < 1) return { valid: false, msg: '如厕时长太短' }
  if (d > 7200) return { valid: false, msg: '单次如厕不能超过2小时' }
  return { valid: true, durationSeconds: d }
}

exports.main = async (event, context) => {
  const { action, params } = event
  switch (action) {
    case 'create': return await createSession(params)
    case 'list': return await listSessions(params)
    case 'stats': return await getStats(params)
    case 'detail': return await getDetail(params)
    case 'dailyStats': return await getDailyStats(params)
    default: return { code: 400, msg: '未知操作: ' + action }
  }
}

async function createSession(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { start_time, end_time, comfort_level, note } = params
  const v = validateSession(params)
  if (!v.valid) return { code: 400, msg: v.msg }
  const durationSeconds = v.durationSeconds
  const now = Date.now()
  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) return { code: 404, msg: '用户不存在' }
  const user = userRes.data[0]
  if (user.work_days_per_month < 1 || user.work_hours_per_day < 1) return { code: 400, msg: '请先设置有效的工作天数和工时' }
  const earnings = calculateEarnings(user.monthly_salary, durationSeconds, user.work_days_per_month, user.work_hours_per_day)
  const feedbackType = getFeedbackType(durationSeconds)
  const today = dateStr(start_time)
  const yesterday = dateStr(start_time - 86400000)
  const last = user.last_session_date || ''
  const hasStreak = last === today || last === yesterday
  const xpEarned = calculateSessionXP(durationSeconds, comfort_level, hasStreak)
  const session = {
    user_id: uid, start_time, end_time, duration_seconds: durationSeconds, earnings,
    salary_at_time: user.monthly_salary, comfort_level, feedback_type: feedbackType,
    xp_earned: xpEarned, note: (note || '').slice(0, 200),
    is_work_hours: isWorkHours(start_time), created_at: now,
  }
  const result = await sessionsCollection.add(session)
  session._id = result.id
  const newTotalXP = (user.total_xp || 0) + xpEarned
  const newTitle = getTitleByXP(newTotalXP)
  const leveledUp = newTitle.level > (user.current_level || 1)
  let streakDays = user.streak_days || 0
  if (last === yesterday) streakDays += 1
  else if (last !== today) streakDays = 1
  await usersCollection.doc(uid).update({
    total_xp: dbCmd.inc(xpEarned), total_poop_earnings: dbCmd.inc(earnings),
    total_sessions: dbCmd.inc(1), total_duration_seconds: dbCmd.inc(durationSeconds),
    current_title: newTitle.title, current_level: newTitle.level,
    streak_days: streakDays, last_session_date: today, updated_at: now,
  })
  let achievements = null
  try {
    const ac = require('../achievement-checker/index')
    const ar = await ac._checkForUser(uid, params)
    if (ar.code === 0 && ar.data.newly_earned.length > 0) achievements = ar.data
  } catch (e) { console.error('成就检测失败', e) }
  return {
    code: 0, msg: '记录成功',
    data: { session, feedback_type: feedbackType, xp_earned: xpEarned, total_xp: newTotalXP,
      current_level: newTitle.level, current_title: newTitle.title, leveled_up: leveledUp,
      streak_days: streakDays, achievements },
  }
}

async function listSessions(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { page = 1, limit = 20, date_start, date_end } = params || {}
  const sk = (page - 1) * Math.min(limit, 50)
  const wh = { user_id: uid }
  if (date_start && date_end) wh.start_time = dbCmd.gte(date_start).and(dbCmd.lte(date_end))
  const cr = await sessionsCollection.where(wh).count()
  const lr = await sessionsCollection.where(wh).orderBy('start_time', 'desc').skip(sk).limit(Math.min(limit, 50)).get()
  return { code: 0, data: { sessions: lr.data, total: cr.total, page, limit, has_more: sk + lr.data.length < cr.total } }
}

async function getStats(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { period = 'week' } = params || {}
  const start = Date.now() - ({ week: 7, month: 30, year: 365, all: 9999 }[period] || 7) * 86400000
  const sr = await sessionsCollection.where({ user_id: uid, start_time: dbCmd.gte(start) }).get()
  const ss = sr.data
  if (ss.length === 0) return { code: 0, data: { period, total_sessions: 0, total_duration_seconds: 0, total_earnings: 0, avg_duration_seconds: 0, avg_comfort: 0, avg_earnings: 0, best_session_earnings: 0, daily_distribution: [], hourly_distribution: new Array(24).fill(0), comfort_trend: [] } }
  const totalDur = ss.reduce(function(s, r) { return s + r.duration_seconds }, 0)
  const totalEarn = ss.reduce(function(s, r) { return s + r.earnings }, 0)
  const totalComf = ss.reduce(function(s, r) { return s + r.comfort_level }, 0)
  const bestEarn = Math.max.apply(null, ss.map(function(r) { return r.earnings }))
  const hd = new Array(24).fill(0); const dm = {}
  ss.forEach(function(s) {
    hd[hourCN(s.start_time)]++
    const ds = dateStr(s.start_time)
    if (!dm[ds]) dm[ds] = { date: ds, sessions: 0, earnings: 0, duration: 0, comfort_sum: 0 }
    dm[ds].sessions++; dm[ds].earnings += s.earnings; dm[ds].duration += s.duration_seconds; dm[ds].comfort_sum += s.comfort_level
  })
  const dd = Object.values(dm).map(function(d) { return { date: d.date, sessions: d.sessions, earnings: Math.round(d.earnings * 100) / 100, duration: d.duration, avg_comfort: Math.round((d.comfort_sum / d.sessions) * 10) / 10 } }).sort(function(a, b) { return a.date.localeCompare(b.date) })
  return { code: 0, data: { period, total_sessions: ss.length, total_duration_seconds: totalDur, total_earnings: Math.round(totalEarn * 100) / 100, avg_duration_seconds: Math.round(totalDur / ss.length), avg_comfort: Math.round((totalComf / ss.length) * 10) / 10, avg_earnings: Math.round((totalEarn / ss.length) * 100) / 100, best_session_earnings: Math.round(bestEarn * 100) / 100, daily_distribution: dd, hourly_distribution: hd, comfort_trend: dd.map(function(d) { return { date: d.date, avg_comfort: d.avg_comfort } }) } }
}

async function getDetail(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { session_id } = params
  if (!session_id) return { code: 400, msg: '缺少记录ID' }
  const r = await sessionsCollection.doc(session_id).get()
  if (!r.data || r.data.length === 0) return { code: 404, msg: '记录不存在' }
  if (r.data[0].user_id !== uid) return { code: 403, msg: '无权查看' }
  return { code: 0, data: { session: r.data[0] } }
}

async function getDailyStats(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { year, month } = params || {}
  if (!year || !month || month < 1 || month > 12) return { code: 400, msg: '请提供有效的年份和月份' }
  const start = new Date(year + '-' + String(month).padStart(2, '0') + '-01T00:00:00+08:00').getTime()
  const em = month === 12 ? 1 : month + 1; const ey = month === 12 ? year + 1 : year
  const end = new Date(ey + '-' + String(em).padStart(2, '0') + '-01T00:00:00+08:00').getTime() - 1
  const sr = await sessionsCollection.where({ user_id: uid, start_time: dbCmd.gte(start).and(dbCmd.lte(end)) }).get()
  const dm = {}
  sr.data.forEach(function(s) {
    const ds = dateStr(s.start_time)
    if (!dm[ds]) dm[ds] = { date: ds, count: 0, earnings: 0, duration: 0 }
    dm[ds].count++; dm[ds].earnings += s.earnings; dm[ds].duration += s.duration_seconds
  })
  return { code: 0, data: { year, month, days: Object.values(dm).map(function(d) { return Object.assign({}, d, { earnings: Math.round(d.earnings * 100) / 100 }) }) } }
}
