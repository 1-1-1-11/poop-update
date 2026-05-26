'use strict'

exports.main = async (event, context) => {
  const reportGen = require('../report-generator/index')
  const result = await reportGen.main({ action: 'generateWeeklyAll', params: {} }, context)

  // TODO: 接入 uni-push 2.0 向每个生成了周报的用户推送消息
  // const pushResult = await sendWeeklyPushNotifications(result.data.generated)

  return {
    code: 0,
    msg: `周报定时任务完成`,
    data: result.data,
  }
}
