# 粑粑升职记 - API 接口文档

> 后端：uniCloud 阿里云 | 调用方式：`uniCloud.callFunction({ name, data: { action, params } })`

---

## 一、user-center 用户中心

### 1.1 register - 注册/初始化用户

```js
uniCloud.callFunction({
  name: 'user-center',
  data: {
    action: 'register',
    params: {
      nickname: '拉屎小能手',        // string, 必填, 1-32字
      avatar_url: 'https://...',     // string, 可选
      wechat_openid: 'oXXXX',       // string, 可选
      monthly_salary: 15000,         // number, 必填, 0-10000000
      work_days_per_month: 22,       // number, 可选, 默认22
      work_hours_per_day: 8,         // number, 可选, 默认8
    }
  }
})
```

**返回：**
```json
{
  "code": 0,
  "msg": "注册成功",
  "data": {
    "user": { /* 完整User对象 */ }
  }
}
```

### 1.2 getProfile - 获取用户信息

```js
{ action: 'getProfile', params: {} }
```

**返回：** `{ code: 0, data: { user: {...} } }`

### 1.3 updateSalary - 更新薪资

```js
{
  action: 'updateSalary',
  params: {
    monthly_salary: 20000,           // number, 必填
    work_days_per_month: 22,         // number, 可选
    work_hours_per_day: 8,           // number, 可选
    note: '升职加薪！'               // string, 可选, 变更备注
  }
}
```

**返回：** `{ code: 0, msg: "薪资更新成功", data: { user: {...} } }`

> 如果新薪资与旧薪资不同，自动追加 salary_history 记录

### 1.4 getSalaryHistory - 获取薪资变更历史

```js
{ action: 'getSalaryHistory', params: {} }
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "history": [
      { "monthly_salary": 15000, "effective_date": 1716681600000, "note": "初始设置" },
      { "monthly_salary": 20000, "effective_date": 1719360000000, "note": "升职加薪！" }
    ]
  }
}
```

### 1.5 updateSettings - 更新用户设置

```js
{
  action: 'updateSettings',
  params: {
    settings: {
      long_sit_alert: true,          // bool, 久蹲提醒
      long_sit_minutes: 20,          // int, 提醒阈值(分钟)
      hydration_reminder: false,     // bool, 喝水提醒
      weekly_report_push: true,      // bool, 周报推送
      sound_enabled: true,           // bool, 音效
      bgm_enabled: false,            // bool, 背景音乐
    }
  }
}
```

---

## 二、session-manager 如厕记录

### 2.1 create - 创建如厕记录（核心接口）

```js
{
  action: 'create',
  params: {
    start_time: 1716681600000,       // timestamp(ms), 必填
    end_time: 1716682200000,         // timestamp(ms), 必填
    comfort_level: 4,                // int 1-5, 必填
    note: '今天很顺畅'               // string, 可选
  }
}
```

**返回：**
```json
{
  "code": 0,
  "msg": "记录成功",
  "data": {
    "session": {
      "_id": "xxx",
      "duration_seconds": 600,
      "earnings": 14.20,
      "feedback_type": "praise",
      "xp_earned": 28,
      "comfort_level": 4,
      "is_work_hours": true
    },
    "feedback_type": "praise",
    "xp_earned": 28,
    "total_xp": 128,
    "current_level": 2,
    "current_title": "如厕专员",
    "leveled_up": true,
    "streak_days": 5
  }
}
```

> **前端提示：**
> - `feedback_type` 用于决定播放哪个动画（praise=烟花, encourage=鼓励, normal=普通）
> - `leveled_up=true` 时播放升级动画
> - 创建记录后应接着调用 `achievement-checker.check` 检查新徽章

### 2.2 list - 查询记录列表

```js
{
  action: 'list',
  params: {
    page: 1,                         // int, 默认1
    limit: 20,                       // int, 默认20, 最大50
    date_start: 1716595200000,       // timestamp, 可选, 筛选起始
    date_end: 1717200000000,         // timestamp, 可选, 筛选结束
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "sessions": [ /* PoopSession[] */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "has_more": true
  }
}
```

### 2.3 stats - 获取统计数据

```js
{
  action: 'stats',
  params: {
    period: 'week'                   // 'week' | 'month' | 'year' | 'all'
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "period": "week",
    "total_sessions": 8,
    "total_duration_seconds": 4800,
    "total_earnings": 113.60,
    "avg_duration_seconds": 600,
    "avg_comfort": 3.8,
    "avg_earnings": 14.20,
    "best_session_earnings": 28.40,
    "daily_distribution": [
      { "date": "2026-05-20", "sessions": 2, "earnings": 28.40, "duration": 1200, "avg_comfort": 4.0 }
    ],
    "hourly_distribution": [0,0,0,0,0,0,0,0,0,2,3,1,0,1,1,0,0,0,0,0,0,0,0,0],
    "comfort_trend": [
      { "date": "2026-05-20", "avg_comfort": 4.0 }
    ]
  }
}
```

> **前端提示：**
> - `daily_distribution` 用于日历热力图
> - `hourly_distribution` 用于24小时分布柱状图（数组索引=小时）
> - `comfort_trend` 用于舒适度趋势折线图

### 2.4 dailyStats - 获取月度日级数据（日历热力图专用）

```js
{
  action: 'dailyStats',
  params: {
    year: 2026,                      // int, 必填
    month: 5,                        // int 1-12, 必填
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "year": 2026,
    "month": 5,
    "days": [
      { "date": "2026-05-20", "count": 2, "earnings": 28.40, "duration": 1200 }
    ]
  }
}
```

### 2.5 detail - 获取单条记录详情

```js
{ action: 'detail', params: { session_id: 'xxx' } }
```

---

## 三、achievement-checker 成就系统

### 3.1 check - 检查并颁发新成就

> 应在每次 `session-manager.create` 成功后调用

```js
{
  action: 'check',
  params: {
    session: {
      duration_seconds: 600,
      earnings: 14.20,
      comfort_level: 4,
      start_time: 1716681600000,
    }
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "newly_earned": [
      { "key": "first_poop", "name": "初来乍到", "description": "完成第一次如厕记录", "rarity": "common", "xp_reward": 20 }
    ],
    "bonus_xp": 20,
    "total_xp": 148,
    "current_title": "如厕专员",
    "current_level": 2
  }
}
```

> **前端提示：** `newly_earned` 非空时弹出徽章获得动画

### 3.2 getBadges - 获取用户徽章列表

```js
{ action: 'getBadges', params: {} }
```

**返回：** `{ code: 0, data: { earned: Badge[], locked: Badge[] } }`

---

## 四、report-generator 报告系统

### 4.1 getWeeklyReport - 获取周报

```js
{
  action: 'getWeeklyReport',
  params: {
    week_start: 1716076800000,       // timestamp, 可选, 不传则返回最近10条
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "reports": [{
      "week_start": 1716076800000,
      "total_sessions": 8,
      "total_duration_seconds": 4800,
      "total_earnings": 113.60,
      "avg_comfort": 3.8,
      "best_session_earnings": 28.40,
      "purchasing_comparisons": [
        { "item_name": "瑞幸咖啡", "item_price": 9.9, "quantity_affordable": 11.4, "icon": "coffee" }
      ]
    }]
  }
}
```

### 4.2 getAnnualReport - 获取年度报告

```js
{ action: 'getAnnualReport', params: { year: 2026 } }
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "report": {
      "year": 2026,
      "total_sessions": 240,
      "total_duration_seconds": 144000,
      "total_earnings": 3408.00,
      "avg_comfort": 3.6,
      "avg_daily_sessions": 1.2,
      "best_session_earnings": 56.80,
      "peak_hour": 10,
      "active_days": 200,
      "monthly_stats": [
        { "month": 1, "sessions": 20, "earnings": 284.00, "duration": 12000 }
      ],
      "salary_changes": [],
      "purchasing_comparisons": [
        { "item_name": "外卖一顿饭", "item_price": 25, "quantity_affordable": 136.3, "icon": "takeout" }
      ],
      "hourly_distribution": [0,0,0,...,0]
    }
  }
}
```

> **前端提示：**
> - `monthly_stats` 用于年度月份柱状图
> - `hourly_distribution` 用于24h分布图
> - `salary_changes` 用于薪资 vs 拉屎收入对比图
> - 年度报告适合用Canvas渲染为可分享的精美卡片

### 4.3 generateWeeklyAll - 批量生成周报（定时任务调用）

> 此接口由 uniCloud 定时触发器调用（每周一早8点），不需要前端调用

---

## 五、group-manager 团队管理

### 5.1 create - 创建战队

```js
{ action: 'create', params: { name: '拉屎天团' } }
```

**返回：** `{ code: 0, data: { group: { _id, name, invite_code, ... } } }`

### 5.2 join - 加入战队

```js
{ action: 'join', params: { invite_code: 'ABC123' } }
```

### 5.3 leave - 退出战队

```js
{ action: 'leave', params: { group_id: 'xxx' } }
```

### 5.4 list - 获取我的战队

```js
{ action: 'list', params: {} }
```

### 5.5 leaderboard - 获取排行榜

```js
{
  action: 'leaderboard',
  params: {
    group_id: 'xxx',
    period: 'week',                  // 'week' | 'month'
    sort_by: 'earnings',             // 'earnings' | 'duration' | 'sessions'
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "nickname": "拉屎小王子",
        "current_title": "马桶总监",
        "total_earnings": 284.00,
        "total_duration": 12000,
        "total_sessions": 20
      }
    ],
    "group_name": "拉屎天团",
    "period": "week"
  }
}
```

### 5.6 feed - 获取团队动态

```js
{ action: 'feed', params: { group_id: 'xxx', limit: 20 } }
```

**返回：** 匿名/非匿名模式下的最近如厕动态列表

---

## 六、错误码

| code | 含义 |
|------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |

---

## 七、数据类型参考

完整 TypeScript 类型定义见 `src/utils/types.ts`

### 薪资计算公式

```
时薪 = 月薪 / 月工作天数 / 日工作小时数
秒薪 = 时薪 / 3600
本次收入 = 秒薪 × 如厕秒数（保留2位小数）
```

前端实时计时器使用 `src/utils/salary-calculator.ts` 中的 `calculatePerSecondRate()` 每秒更新显示。

### 反馈规则
- 时长 >= 10分钟 → `praise`（夸奖动画）
- 时长 5-10分钟 → `normal`（普通动画）
- 时长 < 5分钟 → `encourage`（鼓励动画）

### 经验值规则
- 基础：10 XP
- 时长加成：+1 XP/分钟
- 舒适度加成：舒适度 × 2 XP
- 连续打卡：+5 XP
- 徽章奖励：各不相同（一次性）
