'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const groupsCollection = db.collection('groups')
const usersCollection = db.collection('users')
const sessionsCollection = db.collection('poop-sessions')

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
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const { name } = params
  if (!name || name.length > 32) {
    return { code: 400, msg: '团队名称1-32字' }
  }

  const inviteCode = generateInviteCode()
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
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const { invite_code } = params
  if (!invite_code) return { code: 400, msg: '请输入邀请码' }

  const groupRes = await groupsCollection
    .where({ invite_code })
    .limit(1)
    .get()

  if (!groupRes.data || groupRes.data.length === 0) {
    return { code: 404, msg: '邀请码无效' }
  }

  const group = groupRes.data[0]

  if (group.member_ids.includes(uid)) {
    return { code: 400, msg: '你已经在这个战队了' }
  }

  if (group.member_ids.length >= group.max_members) {
    return { code: 400, msg: '战队已满员' }
  }

  const now = Date.now()
  await groupsCollection.doc(group._id).update({
    member_ids: dbCmd.push([uid]),
  })

  await usersCollection.doc(uid).update({
    group_ids: dbCmd.push([group._id]),
    updated_at: now,
  })

  return { code: 0, msg: `成功加入「${group.name}」`, data: { group_id: group._id, group_name: group.name } }
}

async function leaveGroup(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const { group_id } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) {
    return { code: 404, msg: '团队不存在' }
  }

  const group = groupRes.data[0]
  if (group.creator_id === uid) {
    return { code: 400, msg: '队长不能退出，请先转让队长' }
  }

  const now = Date.now()
  await groupsCollection.doc(group_id).update({
    member_ids: dbCmd.pull(uid),
  })

  await usersCollection.doc(uid).update({
    group_ids: dbCmd.pull(group_id),
    updated_at: now,
  })

  return { code: 0, msg: '已退出战队' }
}

async function listMyGroups(context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const userRes = await usersCollection.doc(uid).field({ group_ids: true }).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { code: 0, data: { groups: [] } }
  }

  const groupIds = userRes.data[0].group_ids || []
  if (groupIds.length === 0) {
    return { code: 0, data: { groups: [] } }
  }

  const groupsRes = await groupsCollection
    .where({ _id: dbCmd.in(groupIds) })
    .get()

  return { code: 0, data: { groups: groupsRes.data } }
}

async function getLeaderboard(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const { group_id, period = 'week', sort_by = 'earnings' } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) {
    return { code: 404, msg: '团队不存在' }
  }

  const group = groupRes.data[0]
  if (!group.member_ids.includes(uid)) {
    return { code: 403, msg: '你不是该团队成员' }
  }

  const now = Date.now()
  let startTime
  switch (period) {
    case 'week': startTime = now - 7 * 86400000; break
    case 'month': startTime = now - 30 * 86400000; break
    default: startTime = now - 7 * 86400000
  }

  const rankings = []
  for (const memberId of group.member_ids) {
    const sessionsRes = await sessionsCollection
      .where({
        user_id: memberId,
        start_time: dbCmd.gte(startTime),
      })
      .get()

    const sessions = sessionsRes.data
    const totalEarnings = sessions.reduce((sum, s) => sum + s.earnings, 0)
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)

    const userRes = await usersCollection.doc(memberId)
      .field({ nickname: true, avatar_url: true, current_title: true })
      .get()

    const userInfo = userRes.data && userRes.data[0]

    rankings.push({
      user_id: memberId,
      nickname: group.is_anonymous ? `神秘拉屎人${memberId.slice(-4)}` : (userInfo ? userInfo.nickname : '未知'),
      avatar_url: group.is_anonymous ? '' : (userInfo ? userInfo.avatar_url : ''),
      current_title: userInfo ? userInfo.current_title : '',
      total_earnings: Math.round(totalEarnings * 100) / 100,
      total_duration: totalDuration,
      total_sessions: sessions.length,
    })
  }

  const sortKey = sort_by === 'duration' ? 'total_duration' : sort_by === 'sessions' ? 'total_sessions' : 'total_earnings'
  rankings.sort((a, b) => b[sortKey] - a[sortKey])
  rankings.forEach((r, i) => { r.rank = i + 1 })

  return { code: 0, data: { rankings, group_name: group.name, period } }
}

async function getGroupFeed(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) return { code: 401, msg: '未登录' }

  const { group_id, limit = 20 } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }

  const groupRes = await groupsCollection.doc(group_id).get()
  if (!groupRes.data || groupRes.data.length === 0) {
    return { code: 404, msg: '团队不存在' }
  }

  const group = groupRes.data[0]
  if (!group.member_ids.includes(uid)) {
    return { code: 403, msg: '你不是该团队成员' }
  }

  const sessionsRes = await sessionsCollection
    .where({
      user_id: dbCmd.in(group.member_ids),
    })
    .orderBy('created_at', 'desc')
    .limit(Math.min(limit, 50))
    .get()

  const feed = sessionsRes.data.map(s => ({
    user_id: s.user_id,
    display_name: group.is_anonymous ? `神秘同事` : s.user_id.slice(-4),
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
