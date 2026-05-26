'use strict'

const CHINA_TZ_OFFSET = 8 * 3600000

/**
 * 从云函数 context 中解析已认证的用户ID。
 * uniCloud 的 uni-id 体系通过 token 传递用户身份，
 * 前端调用 uniCloud.callFunction 时自动附带 uniIdToken。
 */
async function getAuthUid(context) {
  const uniID = require('uni-id-common').createInstance({ context })
  const payload = await uniID.checkToken(context.UNIID_TOKEN || '')
  if (payload.errCode) {
    return { uid: null, errMsg: payload.errMsg || '未登录或token已过期' }
  }
  return { uid: payload.uid, errMsg: null }
}

function getBeijingDate(timestamp) {
  const utc = timestamp || Date.now()
  const beijing = new Date(utc + CHINA_TZ_OFFSET)
  return beijing
}

function getDateStringCN(timestamp) {
  const d = getBeijingDate(timestamp)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDayStartCN(timestamp) {
  const dateStr = getDateStringCN(timestamp)
  return new Date(dateStr + 'T00:00:00+08:00').getTime()
}

function getDayEndCN(timestamp) {
  return getDayStartCN(timestamp) + 86400000 - 1
}

function isWorkHoursCN(timestamp) {
  const d = getBeijingDate(timestamp)
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = d.getUTCHours()
  return hour >= 9 && hour < 18
}

function getHourCN(timestamp) {
  return getBeijingDate(timestamp).getUTCHours()
}

function getWeekMondayCN(timestamp) {
  const d = getBeijingDate(timestamp)
  const day = d.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime() - CHINA_TZ_OFFSET
}

module.exports = {
  getAuthUid,
  getBeijingDate,
  getDateStringCN,
  getDayStartCN,
  getDayEndCN,
  isWorkHoursCN,
  getHourCN,
  getWeekMondayCN,
  CHINA_TZ_OFFSET,
}
