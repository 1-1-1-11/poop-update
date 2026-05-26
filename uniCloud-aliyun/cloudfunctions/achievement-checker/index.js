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
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function checkAchievements(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }
  return await _checkForUser(uid, params)
}

async function _checkForUser(uid, params) {
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
      return false
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

exports._checkForUser = _checkForUser
