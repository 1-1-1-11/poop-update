'use strict'

function validateRequired(params, fields) {
  for (const field of fields) {
    if (params[field] === undefined || params[field] === null) {
      return { valid: false, msg: `缺少必填参数: ${field}` }
    }
  }
  return { valid: true }
}

function validateRange(value, min, max, fieldName) {
  if (typeof value !== 'number' || value < min || value > max) {
    return { valid: false, msg: `${fieldName}范围: ${min}-${max}` }
  }
  return { valid: true }
}

function validateInteger(value, fieldName) {
  if (!Number.isInteger(value)) {
    return { valid: false, msg: `${fieldName}必须为整数` }
  }
  return { valid: true }
}

function validateStringLength(value, min, max, fieldName) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    return { valid: false, msg: `${fieldName}长度: ${min}-${max}字` }
  }
  return { valid: true }
}

function validateSalaryParams(params) {
  const { monthly_salary, work_days_per_month, work_hours_per_day } = params

  if (monthly_salary !== undefined) {
    const r = validateRange(monthly_salary, 0, 10000000, '月薪')
    if (!r.valid) return r
  }
  if (work_days_per_month !== undefined) {
    const r1 = validateInteger(work_days_per_month, '月工作天数')
    if (!r1.valid) return r1
    const r2 = validateRange(work_days_per_month, 1, 31, '月工作天数')
    if (!r2.valid) return r2
  }
  if (work_hours_per_day !== undefined) {
    const r1 = validateInteger(work_hours_per_day, '日工作小时')
    if (!r1.valid) return r1
    const r2 = validateRange(work_hours_per_day, 1, 24, '日工作小时')
    if (!r2.valid) return r2
  }

  return { valid: true }
}

function validateSessionParams(params) {
  const { start_time, end_time, comfort_level } = params

  if (!start_time || !end_time || comfort_level === undefined) {
    return { valid: false, msg: '开始时间、结束时间和舒适度为必填' }
  }

  const r1 = validateInteger(comfort_level, '舒适度')
  if (!r1.valid) return r1

  const r2 = validateRange(comfort_level, 1, 5, '舒适度')
  if (!r2.valid) return r2

  if (end_time <= start_time) {
    return { valid: false, msg: '结束时间必须大于开始时间' }
  }

  const now = Date.now()
  if (start_time > now + 60000) {
    return { valid: false, msg: '不能提交未来的如厕记录' }
  }

  const durationSeconds = Math.round((end_time - start_time) / 1000)
  if (durationSeconds < 1) return { valid: false, msg: '如厕时长太短' }
  if (durationSeconds > 7200) return { valid: false, msg: '单次如厕不能超过2小时' }

  return { valid: true, durationSeconds }
}

module.exports = {
  validateRequired,
  validateRange,
  validateInteger,
  validateStringLength,
  validateSalaryParams,
  validateSessionParams,
}
