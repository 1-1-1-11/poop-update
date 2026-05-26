'use strict'

const db = uniCloud.database()
const usersCollection = db.collection('users')
const { getTitleByXP, TITLE_LEVELS } = require('../../common/salary-calc')

exports.main = async (event, context) => {
  const { action, params } = event

  switch (action) {
    case 'register':
      return await register(params, context)
    case 'getProfile':
      return await getProfile(context)
    case 'updateSalary':
      return await updateSalary(params, context)
    case 'getSalaryHistory':
      return await getSalaryHistory(context)
    case 'updateSettings':
      return await updateSettings(params, context)
    default:
      return { code: 400, msg: `未知操作: ${action}` }
  }
}

async function register(params, context) {
  const { nickname, avatar_url, wechat_openid, monthly_salary, work_days_per_month, work_hours_per_day } = params

  if (!nickname || !monthly_salary) {
    return { code: 400, msg: '昵称和月薪为必填项' }
  }

  if (monthly_salary < 0 || monthly_salary > 10000000) {
    return { code: 400, msg: '月薪范围: 0 - 10,000,000' }
  }

  const now = Date.now()
  const user = {
    nickname,
    avatar_url: avatar_url || '',
    wechat_openid: wechat_openid || '',
    monthly_salary: Math.round(monthly_salary),
    work_days_per_month: work_days_per_month || 22,
    work_hours_per_day: work_hours_per_day || 8,
    salary_history: [{
      monthly_salary: Math.round(monthly_salary),
      effective_date: now,
      note: '初始设置',
    }],
    current_title: TITLE_LEVELS[0].title,
    current_level: 1,
    total_xp: 0,
    total_poop_earnings: 0,
    total_sessions: 0,
    total_duration_seconds: 0,
    streak_days: 0,
    badges: [],
    group_ids: [],
    settings: {
      long_sit_alert: true,
      long_sit_minutes: 20,
      hydration_reminder: false,
      weekly_report_push: true,
      sound_enabled: true,
      bgm_enabled: false,
    },
    created_at: now,
    updated_at: now,
  }

  const result = await usersCollection.add(user)
  user._id = result.id

  return { code: 0, msg: '注册成功', data: { user } }
}

async function getProfile(context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const result = await usersCollection.doc(uid).get()
  if (!result.data || result.data.length === 0) {
    return { code: 404, msg: '用户不存在' }
  }

  return { code: 0, data: { user: result.data[0] } }
}

async function updateSalary(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { monthly_salary, work_days_per_month, work_hours_per_day, note } = params

  if (monthly_salary === undefined || monthly_salary < 0 || monthly_salary > 10000000) {
    return { code: 400, msg: '月薪范围: 0 - 10,000,000' }
  }

  const now = Date.now()
  const userRes = await usersCollection.doc(uid).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { code: 404, msg: '用户不存在' }
  }

  const user = userRes.data[0]
  const newSalary = Math.round(monthly_salary)
  const oldSalary = user.monthly_salary

  const updateData = {
    monthly_salary: newSalary,
    updated_at: now,
  }

  if (work_days_per_month) updateData.work_days_per_month = work_days_per_month
  if (work_hours_per_day) updateData.work_hours_per_day = work_hours_per_day

  if (newSalary !== oldSalary) {
    const salaryRecord = {
      monthly_salary: newSalary,
      effective_date: now,
      note: note || (newSalary > oldSalary ? '升职加薪！' : '薪资调整'),
    }
    updateData.salary_history = [...(user.salary_history || []), salaryRecord]
  }

  await usersCollection.doc(uid).update(updateData)

  const updatedRes = await usersCollection.doc(uid).get()
  return { code: 0, msg: '薪资更新成功', data: { user: updatedRes.data[0] } }
}

async function getSalaryHistory(context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const result = await usersCollection.doc(uid).field({ salary_history: true }).get()
  if (!result.data || result.data.length === 0) {
    return { code: 404, msg: '用户不存在' }
  }

  return { code: 0, data: { history: result.data[0].salary_history || [] } }
}

async function updateSettings(params, context) {
  const uid = context.CLIENTINFO && context.CLIENTINFO.uid
  if (!uid) {
    return { code: 401, msg: '未登录' }
  }

  const { settings } = params
  if (!settings || typeof settings !== 'object') {
    return { code: 400, msg: '设置参数无效' }
  }

  const allowedKeys = ['long_sit_alert', 'long_sit_minutes', 'hydration_reminder', 'weekly_report_push', 'sound_enabled', 'bgm_enabled']
  const updateObj = {}
  for (const key of allowedKeys) {
    if (settings[key] !== undefined) {
      updateObj[`settings.${key}`] = settings[key]
    }
  }

  updateObj.updated_at = Date.now()
  await usersCollection.doc(uid).update(updateObj)

  return { code: 0, msg: '设置已更新' }
}
