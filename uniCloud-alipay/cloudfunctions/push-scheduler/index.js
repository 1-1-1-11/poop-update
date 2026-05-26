'use strict'

exports.main = async (event, context) => {
  const reportGen = require('../report-generator/index')
  const result = await reportGen.main({ action: 'generateWeeklyAll', params: {} }, context)

  const generated = result.data?.generated || 0
  if (generated === 0) {
    return { code: 0, msg: '本周无需推送', data: result.data }
  }

  let pushSuccess = 0
  let pushFail = 0

  try {
    const db = uniCloud.database()
    const usersRes = await db.collection('users')
      .where({ 'settings.weekly_report_push': true })
      .field({ _id: true })
      .get()

    for (const user of usersRes.data) {
      try {
        await uniCloud.sendMessage({
          push_clientid: undefined,
          user_id: user._id,
          title: '粑粑升职记 · 周报来啦',
          content: '本周拉屎报告已生成，快来看看你赚了多少！',
          payload: { type: 'weekly_report' },
          force_notification: true,
        })
        pushSuccess++
      } catch (e) {
        pushFail++
      }
    }
  } catch (e) {
    console.error('推送批量发送异常', e)
  }

  return {
    code: 0,
    msg: `周报定时任务完成`,
    data: { ...result.data, push_success: pushSuccess, push_fail: pushFail },
  }
}
