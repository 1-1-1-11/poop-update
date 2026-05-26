'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const reportsCollection = db.collection('weekly-reports')
const groupsCollection = db.collection('groups')

const CHINA_TZ_OFFSET = 8 * 3600000
function beijing(t) { return new Date((t || Date.now()) + CHINA_TZ_OFFSET) }
function dateStr(t) {
  const d = beijing(t)
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
}
function hourCN(t) { return beijing(t).getUTCHours() }
function weekMonday(t) {
  const d = beijing(t); const day = d.getUTCDay(); const diff = day === 0 ? 6 : day - 1
  const m = new Date(d); m.setUTCDate(d.getUTCDate() - diff); m.setUTCHours(0, 0, 0, 0)
  return m.getTime() - CHINA_TZ_OFFSET
}

const PURCHASE_ITEMS = [
  { name: '瑞幸咖啡', price: 9.9, icon: 'coffee', sort: 1 },
  { name: '蜜雪冰城', price: 4, icon: 'ice-cream', sort: 2 },
  { name: '奶茶', price: 15, icon: 'bubble-tea', sort: 3 },
  { name: '煎饼果子', price: 8, icon: 'pancake', sort: 4 },
  { name: '包子', price: 2, icon: 'bao', sort: 5 },
  { name: '地铁票', price: 3, icon: 'metro', sort: 6 },
  { name: '可乐', price: 3.5, icon: 'cola', sort: 7 },
  { name: '矿泉水', price: 2, icon: 'water', sort: 8 },
  { name: '方便面', price: 5, icon: 'noodle', sort: 9 },
  { name: '视频会员日卡', price: 6, icon: 'vip', sort: 10 },
  { name: '麦当劳巨无霸', price: 25, icon: 'burger', sort: 11 },
  { name: '电影票', price: 35, icon: 'movie', sort: 12 },
  { name: '外卖一顿饭', price: 25, icon: 'takeout', sort: 13 },
  { name: 'AJ球鞋', price: 1299, icon: 'sneaker', sort: 14 },
  { name: 'Switch游戏', price: 299, icon: 'game', sort: 15 },
  { name: 'iPhone', price: 7999, icon: 'phone', sort: 16 },
]

function getUid(p) { return p.userId }

exports.main = async (event, context) => {
  const { action, params } = event
  switch (action) {
    case 'generateWeekly': return await generateWeeklyForUser(params)
    case 'generateWeeklyAll': return await generateWeeklyAll(context)
    case 'getWeeklyReport': return await getWeeklyReport(params)
    case 'getAnnualReport': return await getAnnualReport(params)
    default: return { code: 400, msg: '未知操作: ' + action }
  }
}

async function generateWeeklyForUser(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  return await genReport(uid, params.week_start)
}

async function genReport(uid, weekStart) {
  if (!weekStart) return { code: 400, msg: '缺少周起始时间' }
  const weekEnd = weekStart + 7 * 86400000 - 1
  const existing = await reportsCollection.where({ user_id: uid, week_start: weekStart }).limit(1).get()
  if (existing.data && existing.data.length > 0) return { code: 0, data: { report: existing.data[0] } }
  const sr = await sessionsCollection.where({ user_id: uid, start_time: dbCmd.gte(weekStart).and(dbCmd.lte(weekEnd)) }).get()
  if (sr.data.length === 0) return { code: 0, data: { report: null, msg: '本周无如厕记录' } }
  const ss = sr.data
  const td = ss.reduce(function(s, r) { return s + r.duration_seconds }, 0)
  const te = ss.reduce(function(s, r) { return s + r.earnings }, 0)
  const tc = ss.reduce(function(s, r) { return s + r.comfort_level }, 0)
  const be = Math.max.apply(null, ss.map(function(r) { return r.earnings }))
  const comp = PURCHASE_ITEMS.map(function(i) { return { item_name: i.name, item_price: i.price, quantity_affordable: Math.floor((te / i.price) * 10) / 10, icon: i.icon } }).filter(function(c) { return c.quantity_affordable >= 0.1 }).sort(function(a, b) { return b.quantity_affordable - a.quantity_affordable }).slice(0, 4)
  const ranks = await calcRanks(uid, weekStart, weekEnd)
  const report = { user_id: uid, week_start: weekStart, week_end: weekEnd, total_sessions: ss.length, total_duration_seconds: td, total_earnings: Math.round(te * 100) / 100, avg_comfort: Math.round((tc / ss.length) * 10) / 10, best_session_earnings: Math.round(be * 100) / 100, purchasing_comparisons: comp, rank_in_groups: ranks, generated_at: Date.now() }
  const result = await reportsCollection.add(report)
  report._id = result.id
  return { code: 0, data: { report } }
}

async function calcRanks(uid, ws, we) {
  const ur = await usersCollection.doc(uid).field({ group_ids: true }).get()
  const gids = ur.data[0].group_ids || []
  if (gids.length === 0) return []
  const gr = await groupsCollection.where({ _id: dbCmd.in(gids) }).field({ _id: true, name: true, member_ids: true }).get()
  const ranks = []
  for (const g of gr.data) {
    const as = await sessionsCollection.where({ user_id: dbCmd.in(g.member_ids), start_time: dbCmd.gte(ws).and(dbCmd.lte(we)) }).get()
    const em = {}; g.member_ids.forEach(function(m) { em[m] = 0 })
    as.data.forEach(function(s) { if (em[s.user_id] !== undefined) em[s.user_id] += s.earnings })
    const sorted = Object.entries(em).sort(function(a, b) { return b[1] - a[1] })
    const idx = sorted.findIndex(function(e) { return e[0] === uid })
    ranks.push({ group_id: g._id, group_name: g.name, rank: idx + 1, total_members: g.member_ids.length, my_earnings: Math.round((em[uid] || 0) * 100) / 100 })
  }
  return ranks
}

async function generateWeeklyAll() {
  const lm = weekMonday(Date.now() - 7 * 86400000)
  const ur = await usersCollection.where({ 'settings.weekly_report_push': true }).field({ _id: true }).get()
  let gen = 0
  for (const u of ur.data) { try { await genReport(u._id, lm); gen++ } catch (e) { console.error('生成周报失败 ' + u._id, e) } }
  return { code: 0, data: { generated: gen, total_users: ur.data.length } }
}

async function getWeeklyReport(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { week_start } = params || {}
  const wh = { user_id: uid }
  if (week_start) wh.week_start = week_start
  const r = await reportsCollection.where(wh).orderBy('week_start', 'desc').limit(10).get()
  return { code: 0, data: { reports: r.data } }
}

async function getAnnualReport(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { year } = params
  if (!year || !Number.isInteger(year)) return { code: 400, msg: '请提供有效年份' }
  const ys = new Date(year + '-01-01T00:00:00+08:00').getTime()
  const ye = new Date((year + 1) + '-01-01T00:00:00+08:00').getTime() - 1
  const sr = await sessionsCollection.where({ user_id: uid, start_time: dbCmd.gte(ys).and(dbCmd.lte(ye)) }).get()
  const ss = sr.data
  if (ss.length === 0) return { code: 0, data: { report: null, msg: year + '年无如厕记录' } }
  const td = ss.reduce(function(s, r) { return s + r.duration_seconds }, 0)
  const te = ss.reduce(function(s, r) { return s + r.earnings }, 0)
  const tc = ss.reduce(function(s, r) { return s + r.comfort_level }, 0)
  const be = Math.max.apply(null, ss.map(function(r) { return r.earnings }))
  const ms = {}; const hd = new Array(24).fill(0); const ad = new Set()
  ss.forEach(function(s) {
    const ds = dateStr(s.start_time); const m = parseInt(ds.split('-')[1], 10)
    if (!ms[m]) ms[m] = { month: m, sessions: 0, earnings: 0, duration: 0 }
    ms[m].sessions++; ms[m].earnings += s.earnings; ms[m].duration += s.duration_seconds
    hd[hourCN(s.start_time)]++; ad.add(ds)
  })
  const ph = hd.indexOf(Math.max.apply(null, hd))
  const ur = await usersCollection.doc(uid).field({ salary_history: true }).get()
  const sh = (ur.data[0].salary_history || []).filter(function(s) { return dateStr(s.effective_date).startsWith(String(year)) })
  const comp = PURCHASE_ITEMS.map(function(i) { return { item_name: i.name, item_price: i.price, quantity_affordable: Math.floor((te / i.price) * 10) / 10, icon: i.icon } }).filter(function(c) { return c.quantity_affordable >= 1 }).sort(function(a, b) { return b.item_price - a.item_price }).slice(0, 5)
  return { code: 0, data: { report: { year, total_sessions: ss.length, total_duration_seconds: td, total_earnings: Math.round(te * 100) / 100, avg_comfort: Math.round((tc / ss.length) * 10) / 10, avg_daily_sessions: Math.round((ss.length / ad.size) * 10) / 10, best_session_earnings: Math.round(be * 100) / 100, peak_hour: ph, active_days: ad.size, monthly_stats: Object.values(ms).map(function(m) { return Object.assign({}, m, { earnings: Math.round(m.earnings * 100) / 100 }) }), salary_changes: sh, purchasing_comparisons: comp, hourly_distribution: hd } } }
}
