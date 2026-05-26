'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const badgesCollection = db.collection('badges')
const { getTitleByXP } = require('../../common/salary-calc')
const { getAuthUid, getDayStartCN, getDayEndCN, getHourCN } = require('../../common/utils')

exports.main = async (event, context) => {
  const { action, params } = event

  switch (action) {
    case 'check':
      return await checkAchievements(params, context)
    case 'getBadges':
      return await getBadges(context)
    case 'seedBadges':
      return await seedBadges(context)
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function checkAchievements(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { session } = params || {}

  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) return { code: 404, msg: '用户不存在' }

  const user = userRes.data[0]
  const earnedBadgeKeys = user.badges || []

  const allBadgesRes = await badgesCollection.get()
  const allBadges = allBadgesRes.data
  if (allBadges.length === 0) return { code: 0, data: { newly_earned: [], bonus_xp: 0 } }

  const newlyEarned = []

  for (const badge of allBadges) {
    if (earnedBadgeKeys.includes(badge.key)) continue
    const earned = await evaluateCondition(badge.condition, user, session, uid)
    if (earned) newlyEarned.push(badge)
  }

  if (newlyEarned.length > 0) {
    const newBadgeKeys = newlyEarned.map(b => b.key)
    const bonusXP = newlyEarned.reduce((sum, b) => sum + (b.xp_reward || 0), 0)

    const newTotalXP = (user.total_xp || 0) + bonusXP
    const newTitle = getTitleByXP(newTotalXP)

    await usersCollection.doc(uid).update({
      badges: dbCmd.push(newBadgeKeys),
      total_xp: dbCmd.inc(bonusXP),
      current_title: newTitle.title,
      current_level: newTitle.level,
      updated_at: Date.now(),
    })

    return {
      code: 0,
      data: {
        newly_earned: newlyEarned,
        bonus_xp: bonusXP,
        total_xp: newTotalXP,
        current_title: newTitle.title,
        current_level: newTitle.level,
      },
    }
  }

  return { code: 0, data: { newly_earned: [], bonus_xp: 0 } }
}

async function evaluateCondition(condition, user, session, uid) {
  const { type, threshold } = condition

  switch (type) {
    case 'total_sessions':
      return (user.total_sessions || 0) >= threshold
    case 'total_duration_seconds':
      return (user.total_duration_seconds || 0) >= threshold
    case 'total_earnings':
      return (user.total_poop_earnings || 0) >= threshold
    case 'streak_days':
      return (user.streak_days || 0) >= threshold
    case 'groups_joined':
      return (user.group_ids || []).length >= threshold
    case 'groups_created': {
      const groupsDb = db.collection('groups')
      const countRes = await groupsDb.where({ creator_id: uid }).count()
      return countRes.total >= threshold
    }
    case 'session_over_seconds':
      return session && session.duration_seconds >= threshold
    case 'session_under_seconds':
      return session && session.duration_seconds > 0 && session.duration_seconds <= threshold
    case 'single_earnings':
      return session && session.earnings >= threshold
    case 'comfort_level':
      return session && session.comfort_level >= threshold
    case 'sessions_in_day': {
      if (!session) return false
      const dayStart = getDayStartCN(session.start_time)
      const dayEnd = getDayEndCN(session.start_time)
      const countRes = await sessionsCollection
        .where({ user_id: uid, start_time: dbCmd.gte(dayStart).and(dbCmd.lte(dayEnd)) })
        .count()
      return countRes.total >= threshold
    }
    case 'session_hour_range': {
      if (!session) return false
      const hour = getHourCN(session.start_time)
      if (threshold === 6) return hour >= 6 && hour < 7
      if (threshold === 0) return hour >= 0 && hour < 3
      return false
    }
    case 'weekly_rank_first':
      return false // 由 group-manager 排行榜结算时检查并单独颁发
    default:
      return false
  }
}

async function getBadges(context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const userRes = await usersCollection.doc(uid).field({ badges: true }).get()
  if (!userRes.data || userRes.data.length === 0) return { code: 404, msg: '用户不存在' }

  const earnedKeys = userRes.data[0].badges || []
  const allBadgesRes = await badgesCollection.get()

  const earned = allBadgesRes.data.filter(b => earnedKeys.includes(b.key))
  const locked = allBadgesRes.data.filter(b => !earnedKeys.includes(b.key))

  return { code: 0, data: { earned, locked } }
}

async function seedBadges() {
  const existingCount = await badgesCollection.count()
  if (existingCount.total > 0) {
    return { code: 0, msg: `徽章已存在 (${existingCount.total}个)，跳过` }
  }

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

  for (const badge of BADGE_DEFINITIONS) {
    await badgesCollection.add(badge)
  }

  return { code: 0, msg: `成功插入 ${BADGE_DEFINITIONS.length} 个徽章` }
}
