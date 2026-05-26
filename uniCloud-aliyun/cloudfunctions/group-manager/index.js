'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const groupsCollection = db.collection('groups')
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')
const { getAuthUid } = require('../../common/utils')

exports.main = async (event, context) => {
  const { action, params } = event

  switch (action) {
    case 'create':
      return await createGroup(params, context)
    case 'join':
      return await joinGroup(params, context)
    case 'leave':
      return await leaveGroup(params, context)
    case 'list':
      return await listMyGroups(context)
    case 'leaderboard':
      return await getLeaderboard(params, context)
    case 'feed':
      return await getGroupFeed(params, context)
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function createGroup(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { name } = params
  if (!name || name.length < 1 || name.length > 32) {
    return { code: 400, msg: '团队名称1-32字' }
  }

  let inviteCode
  for (let attempt = 0; attempt < 5; attempt++) {
    inviteCode = generateInviteCode()
    const existing = await groupsCollection.where({ invite_code: inviteCode }).limit(1).get()
    if (!existing.data || existing.data.length === 0) break
    if (attempt === 4) return { code: 500, msg: '邀请码生成失败，请重试' }
  }

  const now = Date.now()
  const group = {
    name,
    creator_id: uid,
    invite_code: inviteCode,
    member_ids: [uid],
    max_members: 50,
    is_anonymous: false,
    created_at: now,
  }

  const result = await groupsCollection.add(group)
  group._id = result.id

  await usersCollection.doc(uid).update({
    group_ids: dbCmd.push([result.id]),
    updated_at: now,
  })

  return { code: 0, msg: '战队创建成功', data: { group } }
}

async function joinGroup(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { invite_code } = params
  if (!invite_code || invite_code.length !== 6) return { code: 400, msg: '请输入6位邀请码' }

  const groupRes = await groupsCollection.where({ invite_code: invite_code.toUpperCase() }).limit(1).get()
  if (!groupRes.data || groupRes.data.length === 0) return { code: 404, msg: '邀请码无效' }

  const group = groupRes.data[0]
  if (group.member_ids.includes(uid)) return { code: 400, msg: '你已经在这个战队了' }
  if (group.member_ids.length >= group.max_members) return { code: 400, msg: '战队已满员' }

  const now = Date.now()
  await groupsCollection.doc(group._id).update({ member_ids: dbCmd.push([uid]) })
  await usersCollection.doc(uid).update({ group_ids: dbCmd.push([group._id]), updated_at: now })

  return { code: 0, msg: `成功加入「${group.name}」`, data: { group_id: group._id, group_name: group.name } }
}

async function leaveGroup(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { group_id } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) return { code: 404, msg: '团队不存在' }

  const group = groupRes.data[0]
  if (group.creator_id === uid) return { code: 400, msg: '队长不能退出，请先转让队长' }
  if (!group.member_ids.includes(uid)) return { code: 400, msg: '你不在该战队中' }

  await groupsCollection.doc(group_id).update({ member_ids: dbCmd.pull(uid) })
  await usersCollection.doc(uid).update({ group_ids: dbCmd.pull(group_id), updated_at: Date.now() })

  return { code: 0, msg: '已退出战队' }
}

async function listMyGroups(context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const userRes = await usersCollection.doc(uid).field({ group_ids: true }).get()
  if (!userRes.data || userRes.data.length === 0) return { code: 0, data: { groups: [] } }

  const groupIds = userRes.data[0].group_ids || []
  if (groupIds.length === 0) return { code: 0, data: { groups: [] } }

  const groupsRes = await groupsCollection.where({ _id: dbCmd.in(groupIds) }).get()
  return { code: 0, data: { groups: groupsRes.data } }
}

async function getLeaderboard(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { group_id, period = 'week', sort_by = 'earnings' } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) return { code: 404, msg: '团队不存在' }

  const group = groupRes.data[0]
  if (!group.member_ids.includes(uid)) return { code: 403, msg: '你不是该团队成员' }

  const now = Date.now()
  const startTime = period === 'month' ? now - 30 * 86400000 : now - 7 * 86400000

  const allSessionsRes = await sessionsCollection
    .where({ user_id: dbCmd.in(group.member_ids), start_time: dbCmd.gte(startTime) })
    .get()

  const memberUsersRes = await usersCollection
    .where({ _id: dbCmd.in(group.member_ids) })
    .field({ _id: true, nickname: true, avatar_url: true, current_title: true })
    .get()

  const userMap = {}
  memberUsersRes.data.forEach(u => { userMap[u._id] = u })

  const statMap = {}
  group.member_ids.forEach(mid => {
    statMap[mid] = { total_earnings: 0, total_duration: 0, total_sessions: 0 }
  })

  allSessionsRes.data.forEach(s => {
    if (!statMap[s.user_id]) return
    statMap[s.user_id].total_earnings += s.earnings
    statMap[s.user_id].total_duration += s.duration_seconds
    statMap[s.user_id].total_sessions++
  })

  const rankings = group.member_ids.map(mid => {
    const userInfo = userMap[mid] || {}
    const stat = statMap[mid]
    return {
      user_id: mid,
      nickname: group.is_anonymous ? `神秘拉屎人${mid.slice(-4)}` : (userInfo.nickname || '未知'),
      avatar_url: group.is_anonymous ? '' : (userInfo.avatar_url || ''),
      current_title: userInfo.current_title || '',
      total_earnings: Math.round(stat.total_earnings * 100) / 100,
      total_duration: stat.total_duration,
      total_sessions: stat.total_sessions,
    }
  })

  const sortKey = sort_by === 'duration' ? 'total_duration' : sort_by === 'sessions' ? 'total_sessions' : 'total_earnings'
  rankings.sort((a, b) => b[sortKey] - a[sortKey])
  rankings.forEach((r, i) => { r.rank = i + 1 })

  return { code: 0, data: { rankings, group_name: group.name, period } }
}

async function getGroupFeed(params, context) {
  const { uid, errMsg } = await getAuthUid(context)
  if (!uid) return { code: 401, msg: errMsg }

  const { group_id, limit = 20 } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) return { code: 404, msg: '团队不存在' }

  const group = groupRes.data[0]
  if (!group.member_ids.includes(uid)) return { code: 403, msg: '你不是该团队成员' }

  const sessionsRes = await sessionsCollection
    .where({ user_id: dbCmd.in(group.member_ids) })
    .orderBy('created_at', 'desc')
    .limit(Math.min(limit, 50))
    .get()

  const memberIds = [...new Set(sessionsRes.data.map(s => s.user_id))]
  const usersRes = memberIds.length > 0
    ? await usersCollection.where({ _id: dbCmd.in(memberIds) }).field({ _id: true, nickname: true }).get()
    : { data: [] }
  const nickMap = {}
  usersRes.data.forEach(u => { nickMap[u._id] = u.nickname })

  const feed = sessionsRes.data.map(s => ({
    user_id: s.user_id,
    display_name: group.is_anonymous ? '神秘同事' : (nickMap[s.user_id] || '未知'),
    earnings: s.earnings,
    duration_seconds: s.duration_seconds,
    feedback_type: s.feedback_type,
    created_at: s.created_at,
  }))

  return { code: 0, data: { feed } }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
