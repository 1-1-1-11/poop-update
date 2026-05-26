# 粑粑升职记 - API 接口文档 v2

> 后端：uniCloud 阿里云 | 调用方式：`uniCloud.callFunction({ name, data: { action, params } })`
>
> **认证方式**：前端通过 uni-id 登录后获取 token，调用云函数时自动携带。后端通过 `uni-id-common.checkToken(context.UNIID_TOKEN)` 解析用户身份。所有需登录接口在 token 无效时返回 `{ code: 401, msg: "..." }`。

---

## 一、user-center 用户中心

### 1.1 register - 注册/初始化用户

> 需已通过 uni-id 登录获取 token。注册时用 token 中的 uid 作为用户 `_id`，幂等操作（重复调用返回已有用户）。

```js
{
  action: 'register',
  params: {
    nickname: '拉屎小能手',        // string, 必填, 1-32字
    monthly_salary: 15000,         // number, 必填, 0-10000000
    work_days_per_month: 22,       // number, 可选, 默认22, 范围1-31
    work_hours_per_day: 8,         // number, 可选, 默认8, 范围1-24
  }
}
```

**返回：** `{ code: 0, msg: "注册成功", data: { user } }`

> **注意**：`work_days_per_month` 和 `work_hours_per_day` 必须 >= 1，否则薪资计算会产生除零错误。

### 1.2 getProfile - 获取用户信息

```js
{ action: 'getProfile', params: {} }
```

**返回：** `{ code: 0, data: { user } }` （不包含 wechat_openid）

### 1.3 updateSalary - 更新薪资

```js
{
  action: 'updateSalary',
  params: {
    monthly_salary: 20000,           // number, 必填, 0-10000000
    work_days_per_month: 22,         // number, 可选, 范围1-31
    work_hours_per_day: 8,           // number, 可选, 范围1-24
    note: '升职加薪！'               // string, 可选
  }
}
```

**返回：** `{ code: 0, msg: "薪资更新成功", data: { user } }`

> 每次调用都追加 salary_history 记录（使用 `dbCmd.push` 原子操作）。

### 1.4 getSalaryHistory - 获取薪资变更历史

```js
{ action: 'getSalaryHistory', params: {} }
```

**返回：** `{ code: 0, data: { history: SalaryRecord[] } }`

### 1.5 updateSettings - 更新用户设置

```js
{
  action: 'updateSettings',
  params: {
    settings: {
      long_sit_alert: true,
      long_sit_minutes: 20,
      hydration_reminder: false,
      weekly_report_push: true,
      sound_enabled: true,
      bgm_enabled: false,
    }
  }
}
```

**返回：** `{ code: 0, msg: "设置已更新" }`

---

## 二、session-manager 如厕记录

### 2.1 create - 创建如厕记录（核心接口）

```js
{
  action: 'create',
  params: {
    start_time: 1716681600000,       // timestamp(ms), 必填, 不能是未来时间
    end_time: 1716682200000,         // timestamp(ms), 必填
    comfort_level: 4,                // int 1-5, 必填
    note: '今天很顺畅'               // string, 可选, 最长200字
  }
}
```

**返回：**
```json
{
  "code": 0,
  "data": {
    "session": { /* PoopSession */ },
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
> - `feedback_type` 决定播放哪个 Lottie 动画（praise=烟花, encourage=鼓励, normal=普通）
> - `leveled_up=true` 时播放升级 Lottie 动画
> - 创建成功后需接着调用 `achievement-checker.check` 检查新徽章
> - 用户计数器使用 `dbCmd.inc()` 原子更新，无竞态风险
> - 所有时间计算使用 UTC+8（北京时间）

**校验规则：**
- `start_time` 不能超过当前时间 + 1分钟
- `end_time > start_time`
- 时长 1秒 ~ 7200秒（2小时）
- 用户的 `work_days_per_month` 和 `work_hours_per_day` 必须 >= 1

### 2.2 list - 查询记录列表

```js
{
  action: 'list',
  params: {
    page: 1,                         // int, 默认1
    limit: 20,                       // int, 默认20, 最大50
    date_start: 1716595200000,       // timestamp, 可选
    date_end: 1717200000000,         // timestamp, 可选
  }
}
```

**返回：** `{ code: 0, data: { sessions[], total, page, limit, has_more } }`

### 2.3 stats - 获取统计数据

```js
{ action: 'stats', params: { period: 'week' } }
// period: 'week' | 'month' | 'year' | 'all'
```

**返回：** `{ code: 0, data: StatsData }` （见 types.ts `StatsData` 接口）

> - `daily_distribution` → 日历热力图
> - `hourly_distribution` → 24小时柱状图（使用 UTC+8 小时）
> - `comfort_trend` → 舒适度折线图

### 2.4 dailyStats - 月度日级数据（日历热力图专用）

```js
{ action: 'dailyStats', params: { year: 2026, month: 5 } }
// month: 1-12 整数
```

### 2.5 detail - 单条记录详情

```js
{ action: 'detail', params: { session_id: 'xxx' } }
```

---

## 三、achievement-checker 成就系统

### 3.1 check - 检查并颁发新成就

> 每次 `session-manager.create` 成功后调用

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

**返回：** `{ code: 0, data: { newly_earned: Badge[], bonus_xp, total_xp, current_title, current_level } }`

> `newly_earned` 非空时弹出徽章获得 Lottie 动画。徽章 XP 使用 `dbCmd.inc()` 原子更新。

### 3.2 getBadges - 获取用户徽章列表

```js
{ action: 'getBadges', params: {} }
```

**返回：** `{ code: 0, data: { earned: Badge[], locked: Badge[] } }`

### 3.3 seedBadges - 初始化徽章数据（部署时调用一次）

```js
{ action: 'seedBadges', params: {} }
```

> 幂等操作：如果 badges 集合已有数据则跳过。部署后端后需调用一次。

---

## 四、report-generator 报告系统

### 4.1 getWeeklyReport - 获取周报

```js
{ action: 'getWeeklyReport', params: { week_start: 1716076800000 } }
// week_start 可选，不传返回最近10条
```

### 4.2 getAnnualReport - 获取年度报告

```js
{ action: 'getAnnualReport', params: { year: 2026 } }
```

**返回：** `{ code: 0, data: { report: AnnualReport } }` （见 types.ts `AnnualReport` 接口）

### 4.3 generateWeeklyAll - 批量生成周报（定时任务，前端不调用）

由 `push-scheduler` 云函数定时触发，使用 UTC+8 计算周一边界。

---

## 五、group-manager 团队管理

### 5.1 create - 创建战队

```js
{ action: 'create', params: { name: '拉屎天团' } }
```

> 邀请码自动生成，带碰撞检测（最多重试5次）。

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

**返回：** `{ code: 0, data: { rankings: LeaderboardEntry[], group_name, period } }`

> 排行榜使用批量查询（2次DB调用），不再有 N+1 问题。

### 5.6 feed - 获取团队动态

```js
{ action: 'feed', params: { group_id: 'xxx', limit: 20 } }
```

> 非匿名模式正确显示用户昵称（批量查询用户信息）。

---

## 六、错误码

| code | 含义 |
|------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录或token过期 |
| 403 | 无权限（查看他人记录/非团队成员等） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 七、数据安全说明

- **所有数据库集合的 create/update/delete 权限均设为 false**，只允许通过云函数操作
- 用户只能读取自己的数据（`doc._id == auth.uid` 或 `doc.user_id == auth.uid`）
- 所有计数器（XP、收入、次数、时长）使用 `dbCmd.inc()` 原子更新
- 所有数组追加（徽章、薪资历史、团队成员）使用 `dbCmd.push()` 原子更新
- 时间计算统一使用 UTC+8（北京时间），通过 `common/utils.js` 中的工具函数

## 八、类型参考

完整 TypeScript 类型定义见 `src/utils/types.ts`，包含：
- `User`, `PoopSession`, `Badge`, `Group`, `WeeklyReport`
- `SessionCreateResult`, `AnnualReport`, `StatsData`
- `LeaderboardEntry`, `TitleDef`, `PurchaseComparison`
