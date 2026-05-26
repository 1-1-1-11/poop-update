import { apiCall, resetMockDatabase } from '../src/services/api'
import type { ApiResponse } from '../src/services/api'
import type { User, PoopSession, StatsData, Badge, Group, WeeklyReport } from '../src/utils/types'

// Mock the global uni-app API object
const localStorageMock: { [key: string]: string } = {}
global.uni = {
  getStorageSync(key: string): string {
    return localStorageMock[key] || ''
  },
  setStorageSync(key: string, val: string): void {
    localStorageMock[key] = val
  },
  removeStorageSync(key: string): void {
    delete localStorageMock[key]
  },
  showToast(options: any): void {
    console.log('[Mock uni.showToast]:', options.title)
  }
} as any

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
  console.log(`[PASS] ${message}`)
}

async function runTests() {
  console.log('=== Starting Baba Promotion Mock Server Integration Tests ===')
  
  // Clean mock database
  resetMockDatabase()
  for (const k of Object.keys(localStorageMock)) {
    delete localStorageMock[k]
  }

  // 1. Test registration validation and success
  console.log('\n--- Test 1: User Registration ---')
  const regFail = await apiCall('user-center', 'register', {})
  assert(regFail.code === 400, 'Registration should fail with missing parameters')

  const regSuccess = await apiCall<{ user: User }>('user-center', 'register', {
    nickname: '拉屎大魔王',
    monthly_salary: 15000,
    work_days_per_month: 22,
    work_hours_per_day: 8
  })
  
  assert(regSuccess.code === 0, 'Registration should succeed')
  assert(regSuccess.data?.user.nickname === '拉屎大魔王', 'Nickname should match')
  assert(regSuccess.data?.user.monthly_salary === 15000, 'Monthly salary should match')
  assert(regSuccess.data?.user.current_title === '排泄主管', 'Initial title should be "排泄主管" (due to mock seeding)')

  // 2. Test getProfile
  console.log('\n--- Test 2: Get Profile ---')
  const profileRes = await apiCall<{ user: User }>('user-center', 'getProfile')
  assert(profileRes.code === 0, 'Get profile should succeed')
  const currentUser = profileRes.data!.user
  assert(currentUser.nickname === '拉屎大魔王', 'Profile nickname should match')
  
  // Note: Local Mock Server's register() calls MockServer.initialize() which loads 30 days of mock history.
  // Verify that mock history is loaded successfully
  assert(currentUser.total_sessions > 0, 'Initial mock session count should be greater than 0')
  assert(currentUser.total_poop_earnings > 0, 'Initial mock earnings should be greater than 0')
  console.log(`Loaded initial mock database with ${currentUser.total_sessions} sessions and ¥${currentUser.total_poop_earnings} earnings.`)

  // 3. Test updateSalary & getSalaryHistory
  console.log('\n--- Test 3: Update Salary ---')
  const oldSalaryHistoryLen = currentUser.salary_history?.length || 0
  const salaryUpdate = await apiCall<{ user: User }>('user-center', 'updateSalary', {
    monthly_salary: 18000,
    note: '升职加薪啦'
  })
  assert(salaryUpdate.code === 0, 'Update salary should succeed')
  assert(salaryUpdate.data?.user.monthly_salary === 18000, 'Updated monthly salary should match')
  assert((salaryUpdate.data?.user.salary_history?.length || 0) === oldSalaryHistoryLen + 1, 'Salary history length should increment')

  const salaryHistory = await apiCall<{ history: any[] }>('user-center', 'getSalaryHistory')
  assert(salaryHistory.code === 0, 'Get salary history should succeed')
  assert(salaryHistory.data?.history.length === (salaryUpdate.data?.user.salary_history?.length || 0), 'Salary history counts should match')

  // 4. Test updateSettings
  console.log('\n--- Test 4: Update Settings ---')
  const settingsUpdate = await apiCall('user-center', 'updateSettings', {
    settings: {
      long_sit_minutes: 25,
      sound_enabled: false
    }
  })
  assert(settingsUpdate.code === 0, 'Update settings should succeed')
  const profileRes2 = await apiCall<{ user: User }>('user-center', 'getProfile')
  assert(profileRes2.data?.user.settings.long_sit_minutes === 25, 'Updated setting minutes should persist')
  assert(profileRes2.data?.user.settings.sound_enabled === false, 'Updated sound setting should persist')

  // 5. Test session-manager: create session (and auto-checking achievements)
  console.log('\n--- Test 5: Create Poop Session & Check Badges ---')
  const startTime = Date.now() - 600 * 1000 // 10 minutes ago
  const endTime = Date.now()
  const createSessionRes = await apiCall<any>('session-manager', 'create', {
    start_time: startTime,
    end_time: endTime,
    comfort_level: 5,
    note: '完美的一次拉屎'
  })
  
  assert(createSessionRes.code === 0, 'Create session should succeed')
  assert(createSessionRes.data?.session.duration_seconds === 600, 'Duration should be 600 seconds')
  assert(createSessionRes.data?.session.comfort_level === 5, 'Comfort level should be 5')
  assert(createSessionRes.data?.xp_earned > 0, 'XP earned should be positive')
  
  // Verify that badges list includes earned badges
  const badgesRes = await apiCall<{ earned: Badge[], locked: Badge[] }>('achievement-checker', 'getBadges')
  assert(badgesRes.code === 0, 'Get badges should succeed')
  assert(badgesRes.data?.earned.length! > 0, 'Should have earned some badges')
  console.log(`Earned badges: ${badgesRes.data?.earned.map(b => b.name).join(', ')}`)

  // 6. Test session-manager: stats
  console.log('\n--- Test 6: Get Stats ---')
  const statsRes = await apiCall<StatsData>('session-manager', 'stats', { period: 'week' })
  assert(statsRes.code === 0, 'Get stats should succeed')
  assert(statsRes.data?.total_sessions! > 0, 'Total sessions in stats should be positive')
  assert(statsRes.data?.hourly_distribution.length === 24, 'Hourly distribution must have 24 hours')
  assert(statsRes.data?.comfort_trend.length! > 0, 'Comfort trend should have entries')

  // 7. Test session-manager: dailyStats
  console.log('\n--- Test 7: Get Daily Stats ---')
  const now = new Date()
  const dailyStatsRes = await apiCall<{ days: any[] }>('session-manager', 'dailyStats', {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  })
  assert(dailyStatsRes.code === 0, 'Get daily stats should succeed')
  assert(dailyStatsRes.data?.days.length! > 0, 'Daily stats should return days with records')

  // 8. Test report-generator: getWeeklyReport
  console.log('\n--- Test 8: Get Weekly Report ---')
  const weeklyReportRes = await apiCall<{ reports: WeeklyReport[] }>('report-generator', 'getWeeklyReport')
  assert(weeklyReportRes.code === 0, 'Get weekly reports should succeed')
  assert(weeklyReportRes.data?.reports.length! > 0, 'Weekly reports should not be empty')
  
  const sampleReport = weeklyReportRes.data?.reports[0]!
  assert(sampleReport.total_sessions > 0, 'Weekly report total sessions should be positive')
  assert(sampleReport.total_earnings > 0, 'Weekly report total earnings should be positive')
  assert(sampleReport.purchasing_comparisons.length > 0, 'Weekly report should have purchasing power comparisons')
  console.log(`Weekly report summary: ¥${sampleReport.total_earnings} earned. Buyable items: ${sampleReport.purchasing_comparisons.map(p => `${p.quantity_affordable}x ${p.item_name}`).join(', ')}`)

  // 9. Test group-manager: create, join, leaderboard, feed
  console.log('\n--- Test 9: Group/Team Operations ---')
  const groupCreate = await apiCall<{ group: Group }>('group-manager', 'create', { name: '打工人拉屎战队' })
  assert(groupCreate.code === 0, 'Create group should succeed')
  const createdGroup = groupCreate.data!.group
  assert(createdGroup.name === '打工人拉屎战队', 'Group name should match')
  assert(createdGroup.invite_code.length === 6, 'Invite code should be 6 characters')

  // Join group (should fail if already joined)
  const groupJoinFail = await apiCall('group-manager', 'join', { invite_code: createdGroup.invite_code })
  assert(groupJoinFail.code === 400, 'Joining group again should fail')

  // Leaderboard
  const leaderboardRes = await apiCall<{ rankings: LeaderboardEntry[], group_name: string }>('group-manager', 'leaderboard', {
    group_id: createdGroup._id,
    period: 'week',
    sort_by: 'earnings'
  })
  assert(leaderboardRes.code === 0, 'Get leaderboard should succeed')
  assert(leaderboardRes.data?.rankings.length! > 0, 'Leaderboard rankings should have members')
  assert(leaderboardRes.data?.rankings[0].total_earnings >= leaderboardRes.data?.rankings[1].total_earnings, 'Leaderboard should be sorted in descending order')

  // Feed
  const feedRes = await apiCall<{ feed: any[] }>('group-manager', 'feed', { group_id: createdGroup._id })
  assert(feedRes.code === 0, 'Get group feed should succeed')
  assert(feedRes.data?.feed.length! > 0, 'Group feed should contain recent events')
  console.log(`Latest feed event: ${feedRes.data?.feed[0].display_name} earned ¥${feedRes.data?.feed[0].earnings}`)

  console.log('\n=== All Mock Server Integration Tests Passed Successfully! ===')
}

runTests().catch(err => {
  console.error('Test run failed with error:', err)
  process.exit(1)
})
