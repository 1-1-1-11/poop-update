'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const badgesCollection = db.collection('badges')

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

const CHINA_TZ_OFFSET = 8 * 3600000
function beijing(t) { return new Date((t || Date.now()) + CHINA_TZ_OFFSET) }
function dateStr(t) {
  const d = beijing(t)
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
}
function dayStartCN(t) { return new Date(dateStr(t) + 'T00:00:00+08:00').getTime() }
function dayEndCN(t) { return dayStartCN(t) + 86400000 - 1 }
function hourCN(t) { return beijing(t).getUTCHours() }

exports.main = async (event, context) => {
  // 兼容 HBuilderX 本地运行测试（可能 action 在 event 根或 params 内）
  const action = event.action || (event.params && event.params.action) || ''
  const params = event.params || event
  switch (action) {
    case 'check': return await checkAchievements(params)
    case 'getBadges': return await getBadges(params)
    case 'seedBadges': return await seedBadges()
    default: {
      // 未指定 action 时尝试自动初始化
      if (action === '' && (!event.action && !event.params)) return await seedBadges()
      return { code: 400, msg: '未知操作: ' + action }
    }
  }
}

async function checkAchievements(params) {
  const { userId } = params || {}
  if (!userId) return { code: 401, msg: '未登录' }
  return await _checkForUser(userId, params)
}

async function seedBadges() {
  const BADGE_DEFINITIONS = [
    { key: 'first_poop', name: '初来乍到', description: '完成第一次如厕记录', icon: 'badge-first-poop', category: 'special', condition: { type: 'total_sessions', threshold: 1 }, xp_reward: 20, rarity: 'common' },
    { key: 'daily_triple', name: '日进斗金', description: '一天内拉屎3次以上', icon: 'badge-daily-triple', category: 'frequency', condition: { type: 'sessions_in_day', threshold: 3 }, xp_reward: 50, rarity: 'common' },
    { key: 'daily_five', name: '高产似母猪', description: '一天内拉屎5次以上', icon: 'badge-daily-five', category: 'frequency', condition: { type: 'sessions_in_day', threshold: 5 }, xp_reward: 100, rarity: 'rare' },
    { key: 'total_100', name: '百屎之王', description: '累计如厕100次', icon: 'badge-total-100', category: 'frequency', condition: { type: 'total_sessions', threshold: 100 }, xp_reward: 200, rarity: 'rare' },
    { key: 'total_500', name: '千古一拉', description: '累计如厕500次', icon: 'badge-total-500', category: 'frequency', condition: { type: 'total_sessions', threshold: 500 }, xp_reward: 500, rarity: 'epic' },
    { key: 'total_1000', name: '拉屎传说', description: '累计如厕1000次', icon: 'badge-total-1000', category: 'frequency', condition: { type: 'total_sessions', threshold: 1000 }, xp_reward: 1000, rarity: 'legendary' },
    { key: 'flash', name: '闪电侠', description: '单次如厕不到2分钟', icon: 'badge-flash', category: 'duration', condition: { type: 'session_under_seconds', threshold: 120 }, xp_reward: 30, rarity: 'common' },
    { key: 'iron_butt', name: '铁屁股', description: '单次如厕超过30分钟', icon: 'badge-iron-butt', category: 'duration', condition: { type: 'session_over_seconds', threshold: 1800 }, xp_reward: 100, rarity: 'rare' },
    { key: 'marathon', name: '马拉松选手', description: '单次如厕超过60分钟', icon: 'badge-marathon', category: 'duration', condition: { type: 'session_over_seconds', threshold: 3600 }, xp_reward: 300, rarity: 'epic' },
    { key: 'total_hours_10', name: '十小时俱乐部', description: '累计如厕超过10小时', icon: 'badge-hours-10', category: 'duration', condition: { type: 'total_duration_seconds', threshold: 36000 }, xp_reward: 200, rarity: 'rare' },
    { key: 'total_hours_100', name: '百小时巨擘', description: '累计如厕超过100小时', icon: 'badge-hours-100', category: 'duration', condition: { type: 'total_duration_seconds', threshold: 360000 }, xp_reward: 1000, rarity: 'legendary' },
    { key: 'streak_7', name: '一周不断', description: '连续打卡7天', icon: 'badge-streak-7', category: 'streak', condition: { type: 'streak_days', threshold: 7 }, xp_reward: 50, rarity: 'common' },
    { key: 'streak_30', name: '风雨无阻', description: '连续打卡30天', icon: 'badge-streak-30', category: 'streak', condition: { type: 'streak_days', threshold: 30 }, xp_reward: 200, rarity: 'rare' },
    { key: 'streak_100', name: '铁打的屁股', description: '连续打卡100天', icon: 'badge-streak-100', category: 'streak', condition: { type: 'streak_days', threshold: 100 }, xp_reward: 500, rarity: 'epic' },
    { key: 'streak_365', name: '全勤之神', description: '连续打卡365天', icon: 'badge-streak-365', category: 'streak', condition: { type: 'streak_days', threshold: 365 }, xp_reward: 2000, rarity: 'legendary' },
    { key: 'earn_100', name: '小有所得', description: '累计拉屎收入¥100', icon: 'badge-earn-100', category: 'earnings', condition: { type: 'total_earnings', threshold: 100 }, xp_reward: 100, rarity: 'common' },
    { key: 'earn_1000', name: '千元大户', description: '累计拉屎收入¥1,000', icon: 'badge-earn-1000', category: 'earnings', condition: { type: 'total_earnings', threshold: 1000 }, xp_reward: 300, rarity: 'rare' },
    { key: 'earn_10000', name: '月入过万', description: '累计拉屎收入¥10,000', icon: 'badge-earn-10000', category: 'earnings', condition: { type: 'total_earnings', threshold: 10000 }, xp_reward: 1000, rarity: 'epic' },
    { key: 'single_earn_50', name: '一泡值千金', description: '单次收入超过¥50', icon: 'badge-single-50', category: 'earnings', condition: { type: 'single_earnings', threshold: 50 }, xp_reward: 200, rarity: 'rare' },
    { key: 'first_group', name: '入队新兵', description: '加入第一个战队', icon: 'badge-first-group', category: 'social', condition: { type: 'groups_joined', threshold: 1 }, xp_reward: 30, rarity: 'common' },
    { key: 'group_leader', name: '建队先锋', description: '创建一个战队', icon: 'badge-group-leader', category: 'social', condition: { type: 'groups_created', threshold: 1 }, xp_reward: 50, rarity: 'common' },
    { key: 'weekly_king', name: '本周拉屎王', description: '团队周排行第一', icon: 'badge-weekly-king', category: 'social', condition: { type: 'weekly_rank_first', threshold: 1 }, xp_reward: 100, rarity: 'rare' },
    { key: 'comfort_five', name: '舒适之王', description: '获得一次5星舒适度', icon: 'badge-comfort-five', category: 'special', condition: { type: 'comfort_level', threshold: 5 }, xp_reward: 30, rarity: 'common' },
    { key: 'early_bird', name: '早起的鸟儿有屎拉', description: '在早上6-7点如厕', icon: 'badge-early-bird', category: 'special', condition: { type: 'session_hour_range', threshold: 6 }, xp_reward: 50, rarity: 'rare' },
    { key: 'night_owl', name: '夜猫子', description: '在凌晨0-3点如厕', icon: 'badge-night-owl', category: 'special', condition: { type: 'session_hour_range', threshold: 0 }, xp_reward: 50, rarity: 'rare' },
  ]
  const col = db.collection('badges')
  const existing = await col.count()
  if (existing.total > 0) return { code: 0, msg: '徽章数据已存在，跳过' }
  for (const b of BADGE_DEFINITIONS) await col.add(b)
  return { code: 0, msg: '徽章数据初始化完成', count: BADGE_DEFINITIONS.length }
}

async function _checkForUser(uid, params) {
  const { session } = params || {}
  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) return { code: 404, msg: '用户不存在' }
  const user = userRes.data[0]
  const earned = user.badges || []
  const allRes = await badgesCollection.get()
  const allBadges = allRes.data
  if (allBadges.length === 0) return { code: 0, data: { newly_earned: [], bonus_xp: 0 } }
  const newly = []
  for (const badge of allBadges) {
    if (earned.includes(badge.key)) continue
    if (await evalCond(badge.condition, user, session, uid)) newly.push(badge)
  }
  if (newly.length > 0) {
    const keys = newly.map(function(b) { return b.key })
    const bonus = newly.reduce(function(s, b) { return s + (b.xp_reward || 0) }, 0)
    const nxp = (user.total_xp || 0) + bonus
    const nt = getTitleByXP(nxp)
    await usersCollection.doc(uid).update({ badges: dbCmd.push(keys), total_xp: dbCmd.inc(bonus), current_title: nt.title, current_level: nt.level, updated_at: Date.now() })
    return { code: 0, data: { newly_earned: newly, bonus_xp: bonus, total_xp: nxp, current_title: nt.title, current_level: nt.level } }
  }
  return { code: 0, data: { newly_earned: [], bonus_xp: 0 } }
}

async function evalCond(cond, user, session, uid) {
  const { type, threshold } = cond
  switch (type) {
    case 'total_sessions': return (user.total_sessions || 0) >= threshold
    case 'total_duration_seconds': return (user.total_duration_seconds || 0) >= threshold
    case 'total_earnings': return (user.total_poop_earnings || 0) >= threshold
    case 'streak_days': return (user.streak_days || 0) >= threshold
    case 'groups_joined': return (user.group_ids || []).length >= threshold
    case 'groups_created': { const r = await db.collection('groups').where({ creator_id: uid }).count(); return r.total >= threshold }
    case 'session_over_seconds': return session && session.duration_seconds >= threshold
    case 'session_under_seconds': return session && session.duration_seconds > 0 && session.duration_seconds <= threshold
    case 'single_earnings': return session && session.earnings >= threshold
    case 'comfort_level': return session && session.comfort_level >= threshold
    case 'sessions_in_day': { if (!session) return false; const r = await sessionsCollection.where({ user_id: uid, start_time: dbCmd.gte(dayStartCN(session.start_time)).and(dbCmd.lte(dayEndCN(session.start_time))) }).count(); return r.total >= threshold }
    case 'session_hour_range': { if (!session) return false; const h = hourCN(session.start_time); return (threshold === 6 && h >= 6 && h < 7) || (threshold === 0 && h >= 0 && h < 3) }
    case 'weekly_rank_first': return false
    default: return false
  }
}

async function getBadges(params) {
  const { userId } = params
  if (!userId) return { code: 401, msg: '未登录' }
  const ur = await usersCollection.doc(userId).field({ badges: true }).get()
  if (!ur.data || ur.data.length === 0) return { code: 404, msg: '用户不存在' }
  const keys = ur.data[0].badges || []
  const all = await badgesCollection.get()
  return { code: 0, data: { earned: all.data.filter(function(b) { return keys.includes(b.key) }), locked: all.data.filter(function(b) { return !keys.includes(b.key) }) } }
}

exports._checkForUser = _checkForUser
