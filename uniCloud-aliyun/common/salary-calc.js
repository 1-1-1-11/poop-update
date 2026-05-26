/**
 * 服务端薪资计算逻辑（与前端 salary-calculator.ts 保持一致）
 * 供所有云函数引用
 */

function calculateHourlyRate(monthlySalary, workDaysPerMonth = 22, workHoursPerDay = 8) {
  return monthlySalary / workDaysPerMonth / workHoursPerDay
}

function calculatePerSecondRate(monthlySalary, workDaysPerMonth = 22, workHoursPerDay = 8) {
  return calculateHourlyRate(monthlySalary, workDaysPerMonth, workHoursPerDay) / 3600
}

function calculateEarnings(monthlySalary, durationSeconds, workDaysPerMonth = 22, workHoursPerDay = 8) {
  const perSecond = calculatePerSecondRate(monthlySalary, workDaysPerMonth, workHoursPerDay)
  return Math.round(perSecond * durationSeconds * 100) / 100
}

function getFeedbackType(durationSeconds) {
  const minutes = durationSeconds / 60
  if (minutes >= 10) return 'praise'
  if (minutes >= 5) return 'normal'
  return 'encourage'
}

function calculateSessionXP(durationSeconds, comfortLevel, hasStreak) {
  const base = 10
  const durationBonus = Math.floor(durationSeconds / 60)
  const comfortBonus = comfortLevel * 2
  const streakBonus = hasStreak ? 5 : 0
  return base + durationBonus + comfortBonus + streakBonus
}

const TITLE_LEVELS = [
  { level: 1, title: '厕所实习生', minXP: 0 },
  { level: 2, title: '如厕专员', minXP: 100 },
  { level: 3, title: '排泄主管', minXP: 500 },
  { level: 4, title: '便便经理', minXP: 1500 },
  { level: 5, title: '马桶总监', minXP: 5000 },
  { level: 6, title: '茅房VP', minXP: 15000 },
  { level: 7, title: '厕神CEO', minXP: 50000 },
]

function getTitleByXP(totalXP) {
  for (let i = TITLE_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= TITLE_LEVELS[i].minXP) {
      return TITLE_LEVELS[i]
    }
  }
  return TITLE_LEVELS[0]
}

module.exports = {
  calculateHourlyRate,
  calculatePerSecondRate,
  calculateEarnings,
  getFeedbackType,
  calculateSessionXP,
  getTitleByXP,
  TITLE_LEVELS,
}
