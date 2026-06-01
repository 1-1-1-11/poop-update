export interface ThemeLabelSet {
  stock: string
  lab: string
}

export const themeLabels: Record<string, ThemeLabelSet> = {
  // Common Terms
  poopDuration: { stock: '持仓时间', lab: '实验时长' },
  earnings: { stock: '浮动盈亏', lab: '经济产出' },
  secondSalary: { stock: '实时报价', lab: '代谢率' },
  todayCount: { stock: '当日成交', lab: '样本计数' },
  history: { stock: '交易流水', lab: '实验日志' },
  duration: { stock: '累计耗时', lab: '累积用时' },
  streakDays: { stock: '连续开盘天数', lab: '连续实验天数' },
  
  // Index Page
  indexTitle: { stock: '交易看板', lab: '实验概览' },
  todayReport: { stock: '今日实盘收益', lab: '今日实验产出' },
  startPoop: { stock: '开启交易', lab: '启动实验' },
  navFortune: { stock: '盘前预测', lab: '实验黄历' },
  navWeekly: { stock: '周度研报', lab: '实验周报' },
  navRank: { stock: '龙虎榜单', lab: '学术排名' },
  navBadge: { stock: '荣誉勋章', lab: '科研奖章' },
  navSocial: { stock: '自营团队 PK', lab: '课题组 PK' },

  // Timer Page
  timerStatus: { stock: '交易撮合中...', lab: '实验反应中...' },
  timerTitle: { stock: '努力平仓中...', lab: '样本分析中...' },
  earningsRealtime: { stock: '预期浮动收益', lab: '当前产出能量' },

  // Result Page
  resultTitle: { stock: '交易结算单', lab: '实验分析报告' },
  saveButton: { stock: '交割确认', lab: '存入数据库' },
  cancelButton: { stock: '废单处理', lab: '作废实验' },
  comfortLevel: { stock: '操作满意度', lab: '实验纯净度' },
  sessionNote: { stock: '交易备注', lab: '实验备注' },

  // Stats Page
  statsTitle: { stock: 'K线数据走势', lab: '科研正态分布' },
  totalProfit: { stock: '累计总收益', lab: '总计总产出' },

  // Profile Page
  profileTitle: { stock: '账户总览', lab: '研究员档案' },
  totalAssets: { stock: '总资产价值', lab: '总科研产出' },
  totalCount: { stock: '总交易笔数', lab: '总实验频次' },
  totalDuration: { stock: '总交易时长', lab: '总实验时长' },

  // Rank Page
  rankTitle: { stock: '席位等级', lab: '学术职称' },
  xpProgress: { stock: '保证金 (XP)', lab: '科研经验 (XP)' },
  nextRank: { stock: '距离下个席位', lab: '距离下个职称' },

  // Social Page
  socialTitle: { stock: '拉屎战队', lab: '科研课题组' },
  teamEarnings: { stock: '团队总收益', lab: '课题组总产出' },
  memberContribution: { stock: '贡献率', lab: '课题贡献' }
}

export function getThemeLabel(key: string, theme: 'stock' | 'lab'): string {
  const item = themeLabels[key]
  if (!item) return key
  return item[theme]
}
