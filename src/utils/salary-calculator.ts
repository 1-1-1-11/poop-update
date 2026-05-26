import type { FeedbackType, ComfortLevel } from './types'

export function calculateHourlyRate(
  monthlySalary: number,
  workDaysPerMonth: number = 22,
  workHoursPerDay: number = 8
): number {
  return monthlySalary / workDaysPerMonth / workHoursPerDay
}

export function calculatePerSecondRate(
  monthlySalary: number,
  workDaysPerMonth: number = 22,
  workHoursPerDay: number = 8
): number {
  return calculateHourlyRate(monthlySalary, workDaysPerMonth, workHoursPerDay) / 3600
}

export function calculateEarnings(
  monthlySalary: number,
  durationSeconds: number,
  workDaysPerMonth: number = 22,
  workHoursPerDay: number = 8
): number {
  const perSecond = calculatePerSecondRate(monthlySalary, workDaysPerMonth, workHoursPerDay)
  return Math.round(perSecond * durationSeconds * 100) / 100
}

export function getFeedbackType(durationSeconds: number): FeedbackType {
  const minutes = durationSeconds / 60
  if (minutes >= 10) return 'praise'
  if (minutes >= 5) return 'normal'
  return 'encourage'
}

const PRAISE_MESSAGES = [
  '持久战大师！沉稳如山！',
  '这一蹲，价值连城！',
  '老板看了都要鼓掌！',
  '十分钟起步，大佬风范！',
  '稳如泰山，坐如磐石！',
  '论持久，你说第二没人敢说第一！',
]

const NORMAL_MESSAGES = [
  '完美如厕，效率之王！',
  '不慌不忙，恰到好处！',
  '高效输出，职场达人！',
  '时间刚刚好，拿捏得当！',
]

const ENCOURAGE_MESSAGES = [
  '速度有余，下次可以更从容！',
  '闪电侠出击！下次可以慢慢享受~',
  '效率太高了！老板表示佩服！',
  '来去如风，但别忘了赚钱要紧！',
]

export function getFeedbackMessage(feedbackType: FeedbackType): string {
  let pool: string[]
  switch (feedbackType) {
    case 'praise':
      pool = PRAISE_MESSAGES
      break
    case 'normal':
      pool = NORMAL_MESSAGES
      break
    case 'encourage':
      pool = ENCOURAGE_MESSAGES
      break
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function calculateSessionXP(
  durationSeconds: number,
  comfortLevel: ComfortLevel,
  hasStreak: boolean
): number {
  const base = 10
  const durationBonus = Math.floor(durationSeconds / 60)
  const comfortBonus = comfortLevel * 2
  const streakBonus = hasStreak ? 5 : 0
  return base + durationBonus + comfortBonus + streakBonus
}

export interface TitleDef {
  level: number
  title: string
  minXP: number
}

export const TITLE_LEVELS: TitleDef[] = [
  { level: 1, title: '厕所实习生', minXP: 0 },
  { level: 2, title: '如厕专员', minXP: 100 },
  { level: 3, title: '排泄主管', minXP: 500 },
  { level: 4, title: '便便经理', minXP: 1500 },
  { level: 5, title: '马桶总监', minXP: 5000 },
  { level: 6, title: '茅房VP', minXP: 15000 },
  { level: 7, title: '厕神CEO', minXP: 50000 },
]

export function getTitleByXP(totalXP: number): TitleDef {
  for (let i = TITLE_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= TITLE_LEVELS[i].minXP) {
      return TITLE_LEVELS[i]
    }
  }
  return TITLE_LEVELS[0]
}

export function getNextTitle(currentLevel: number): TitleDef | null {
  const idx = TITLE_LEVELS.findIndex(t => t.level === currentLevel)
  if (idx < 0 || idx >= TITLE_LEVELS.length - 1) return null
  return TITLE_LEVELS[idx + 1]
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return s === 0 ? `${m}分钟` : `${m}分${s}秒`
}

export function formatEarnings(amount: number): string {
  if (amount >= 100) return `¥${amount.toFixed(1)}`
  return `¥${amount.toFixed(2)}`
}
