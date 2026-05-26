export interface SalaryRecord {
  monthly_salary: number
  effective_date: number
  note?: string
}

export interface UserSettings {
  long_sit_alert: boolean
  long_sit_minutes: number
  hydration_reminder: boolean
  weekly_report_push: boolean
  sound_enabled: boolean
  bgm_enabled: boolean
}

export interface User {
  _id: string
  nickname: string
  avatar_url: string
  wechat_openid?: string
  monthly_salary: number
  work_days_per_month: number
  work_hours_per_day: number
  salary_history: SalaryRecord[]
  current_title: string
  current_level: number
  total_xp: number
  total_poop_earnings: number
  total_sessions: number
  total_duration_seconds: number
  streak_days: number
  badges: string[]
  group_ids: string[]
  settings: UserSettings
  created_at: number
  updated_at: number
}

export type ComfortLevel = 1 | 2 | 3 | 4 | 5

export type FeedbackType = 'praise' | 'encourage' | 'normal'

export interface PoopSession {
  _id: string
  user_id: string
  start_time: number
  end_time: number
  duration_seconds: number
  earnings: number
  salary_at_time: number
  comfort_level: ComfortLevel
  feedback_type: FeedbackType
  xp_earned: number
  note?: string
  is_work_hours: boolean
  created_at: number
}

export interface PurchaseComparison {
  item_name: string
  item_price: number
  quantity_affordable: number
  icon: string
}

export interface GroupRank {
  group_id: string
  group_name: string
  rank: number
  total_members: number
}

export interface WeeklyReport {
  _id: string
  user_id: string
  week_start: number
  week_end: number
  total_sessions: number
  total_duration_seconds: number
  total_earnings: number
  avg_comfort: number
  best_session_earnings: number
  purchasing_comparisons: PurchaseComparison[]
  rank_in_groups: GroupRank[]
  generated_at: number
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeCategory = 'frequency' | 'duration' | 'streak' | 'earnings' | 'social' | 'special'

export interface BadgeCondition {
  type: string
  threshold: number
}

export interface Badge {
  _id: string
  key: string
  name: string
  description: string
  icon: string
  category: BadgeCategory
  condition: BadgeCondition
  xp_reward: number
  rarity: BadgeRarity
}

export interface TitleLevel {
  level: number
  title: string
  min_xp: number
  avatar: string
  unlock_features: string[]
}

export interface Group {
  _id: string
  name: string
  creator_id: string
  invite_code: string
  member_ids: string[]
  max_members: number
  is_anonymous: boolean
  created_at: number
}

export interface LeaderboardEntry {
  user_id: string
  nickname: string
  avatar_url: string
  current_title: string
  value: number
  rank: number
}
