'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const groupsCollection = db.collection('groups')
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
function getTitleByXP(t) {
  for (let i = TITLE_LEVELS.length - 1; i >= 0; i--) if (t >= TITLE_LEVELS[i].minXP) return TITLE_LEVELS[i]
  return TITLE_LEVELS[0]
}
function getUid(p) { return p.userId }

exports.main = async (event, context) => {
  const { action, params } = event
  switch (action) {
    case 'create': return await createGroup(params)
    case 'join': return await joinGroup(params)
    case 'leave': return await leaveGroup(params)
    case 'list': return await listMyGroups(params)
    case 'leaderboard': return await getLeaderboard(params)
    case 'feed': return await getGroupFeed(params)
    default: return { code: 400, msg: '未知操作: ' + action }
  }
}

async function createGroup(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { name } = params
  if (!name || name.length < 1 || name.length > 32) return { code: 400, msg: '团队名称1-32字' }
  let code
  for (let a = 0; a < 5; a++) {
    code = genCode(); const e = await groupsCollection.where({ invite_code: code }).limit(1).get()
    if (!e.data || e.data.length === 0) break
    if (a === 4) return { code: 500, msg: '邀请码生成失败' }
  }
  const now = Date.now()
  const g = { name, creator_id: uid, invite_code: code, member_ids: [uid], max_members: 50, is_anonymous: false, created_at: now }
  const r = await groupsCollection.add(g); g._id = r.id
  await usersCollection.doc(uid).update({ group_ids: dbCmd.push([r.id]), updated_at: now })
  return { code: 0, msg: '战队创建成功', data: { group: g } }
}

async function joinGroup(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { invite_code } = params
  if (!invite_code || invite_code.length !== 6) return { code: 400, msg: '请输入6位邀请码' }
  const gr = await groupsCollection.where({ invite_code: invite_code.toUpperCase() }).limit(1).get()
  if (!gr.data || gr.data.length === 0) return { code: 404, msg: '邀请码无效' }
  const g = gr.data[0]
  if (g.member_ids.includes(uid)) return { code: 400, msg: '你已经在这个战队了' }
  if (g.member_ids.length >= g.max_members) return { code: 400, msg: '战队已满员' }
  const now = Date.now()
  await groupsCollection.doc(g._id).update({ member_ids: dbCmd.push([uid]) })
  await usersCollection.doc(uid).update({ group_ids: dbCmd.push([g._id]), updated_at: now })
  return { code: 0, msg: '成功加入「' + g.name + '」', data: { group_id: g._id, group_name: g.name } }
}

async function leaveGroup(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { group_id } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }
  const gr = await groupsCollection.doc(group_id).get()
  if (!gr.data || gr.data.length === 0) return { code: 404, msg: '团队不存在' }
  const g = gr.data[0]
  if (g.creator_id === uid) return { code: 400, msg: '队长不能退出' }
  if (!g.member_ids.includes(uid)) return { code: 400, msg: '你不在该战队中' }
  await groupsCollection.doc(group_id).update({ member_ids: dbCmd.pull(uid) })
  await usersCollection.doc(uid).update({ group_ids: dbCmd.pull(group_id), updated_at: Date.now() })
  return { code: 0, msg: '已退出战队' }
}

async function listMyGroups(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const ur = await usersCollection.doc(uid).field({ group_ids: true }).get()
  if (!ur.data || ur.data.length === 0) return { code: 0, data: { groups: [] } }
  const ids = ur.data[0].group_ids || []
  if (ids.length === 0) return { code: 0, data: { groups: [] } }
  const gr = await groupsCollection.where({ _id: dbCmd.in(ids) }).get()
  return { code: 0, data: { groups: gr.data } }
}

async function getLeaderboard(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { group_id, period = 'week', sort_by = 'earnings' } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }
  const gr = await groupsCollection.doc(group_id).get()
  if (!gr.data || gr.data.length === 0) return { code: 404, msg: '团队不存在' }
  const g = gr.data[0]
  if (!g.member_ids.includes(uid)) return { code: 403, msg: '你不是该团队成员' }
  const start = Date.now() - (period === 'month' ? 30 : 7) * 86400000
  const as = await sessionsCollection.where({ user_id: dbCmd.in(g.member_ids), start_time: dbCmd.gte(start) }).get()
  const mu = await usersCollection.where({ _id: dbCmd.in(g.member_ids) }).field({ _id: true, nickname: true, avatar_url: true, current_title: true }).get()
  const um = {}; mu.data.forEach(function(u) { um[u._id] = u })
  const sm = {}; g.member_ids.forEach(function(m) { sm[m] = { total_earnings: 0, total_duration: 0, total_sessions: 0 } })
  as.data.forEach(function(s) { if (sm[s.user_id]) { sm[s.user_id].total_earnings += s.earnings; sm[s.user_id].total_duration += s.duration_seconds; sm[s.user_id].total_sessions++ } })
  const rankings = g.member_ids.map(function(mid) {
    const ui = um[mid] || {}; const st = sm[mid]
    return { user_id: mid, nickname: g.is_anonymous ? '神秘拉屎人' + mid.slice(-4) : (ui.nickname || '未知'), avatar_url: g.is_anonymous ? '' : (ui.avatar_url || ''), current_title: ui.current_title || '', total_earnings: Math.round(st.total_earnings * 100) / 100, total_duration: st.total_duration, total_sessions: st.total_sessions }
  })
  const sk = sort_by === 'duration' ? 'total_duration' : sort_by === 'sessions' ? 'total_sessions' : 'total_earnings'
  rankings.sort(function(a, b) { return b[sk] - a[sk] })
  rankings.forEach(function(r, i) { r.rank = i + 1 })
  if (period === 'week' && sort_by === 'earnings' && rankings.length > 0 && rankings[0].total_earnings > 0) {
    try {
      const tu = await usersCollection.doc(rankings[0].user_id).field({ badges: true, total_xp: true }).get()
      const top = tu.data[0]
      if (top && !(top.badges || []).includes('weekly_king')) {
        const br = await badgesCollection.where({ key: 'weekly_king' }).limit(1).get()
        if (br.data.length > 0) {
          const bd = br.data[0]; const nxp = (top.total_xp || 0) + bd.xp_reward; const nt = getTitleByXP(nxp)
          await usersCollection.doc(rankings[0].user_id).update({ badges: dbCmd.push(['weekly_king']), total_xp: dbCmd.inc(bd.xp_reward), current_title: nt.title, current_level: nt.level, updated_at: Date.now() })
        }
      }
    } catch (e) { console.error('weekly_king徽章失败', e) }
  }
  return { code: 0, data: { rankings, group_name: g.name, period } }
}

async function getGroupFeed(params) {
  const uid = getUid(params)
  if (!uid) return { code: 401, msg: '未登录' }
  const { group_id, limit = 20 } = params
  if (!group_id) return { code: 400, msg: '缺少团队ID' }
  const gr = await groupsCollection.doc(group_id).get()
  if (!gr.data || gr.data.length === 0) return { code: 404, msg: '团队不存在' }
  const g = gr.data[0]
  if (!g.member_ids.includes(uid)) return { code: 403, msg: '你不是该团队成员' }
  const sr = await sessionsCollection.where({ user_id: dbCmd.in(g.member_ids) }).orderBy('created_at', 'desc').limit(Math.min(limit, 50)).get()
  const mids = []; sr.data.forEach(function(s) { if (mids.indexOf(s.user_id) === -1) mids.push(s.user_id) })
  const ur = mids.length > 0 ? await usersCollection.where({ _id: dbCmd.in(mids) }).field({ _id: true, nickname: true }).get() : { data: [] }
  const nm = {}; ur.data.forEach(function(u) { nm[u._id] = u.nickname })
  return { code: 0, data: { feed: sr.data.map(function(s) { return { user_id: s.user_id, display_name: g.is_anonymous ? '神秘同事' : (nm[s.user_id] || '未知'), earnings: s.earnings, duration_seconds: s.duration_seconds, feedback_type: s.feedback_type, created_at: s.created_at } }) } }
}

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = ''
  for (let i = 0; i < 6; i++) r += c.charAt(Math.floor(Math.random() * c.length))
  return r
}
