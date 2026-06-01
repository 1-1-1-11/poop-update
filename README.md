# 粑粑升职记 💩

> 每一次如厕，都是一次升职加薪的机会

一款趣味工具 APP，记录上厕所时长，根据真实薪资计算"拉屎工资"，让每一次带薪如厕都有成就感。

---

## 🎨 双主题视觉与 GSAP 动画系统

本项目引入了全新的**双主题自适应切换系统**，通过 CSS 自定义属性驱动全局样式，并在 H5 与微信小程序端实现无缝的平滑过渡。此外，全应用通过 GSAP 3 库进行了深度的动画覆盖，满足高级无障碍动效标准。

### 1. 核心主题模式

| 维度 | 🏦 金融交易所主题 (`stock`) | 🧪 科学实验室主题 (`lab`) |
| :--- | :--- | :--- |
| **设计背景** | 极简黑色系，还原沉浸式实盘看盘体验 | 清爽浅色系，还原学术科研建档环境 |
| **主基调色** | 背景：`#0D1117` \| 卡片：`rgba(255,255,255,0.03)` | 背景：`#F8F9FA` \| 卡片：`#FFFFFF` |
| **高亮配色** | 浮动盈亏：`#00E676` (绿) \| 预警：`#FF6B35` (红) | 反应合成：`#3498DB` (蓝) \| 预警：`#E74C3C` (红) |
| **高端字体** | 等宽字体 `JetBrains Mono`（行情跳动） | 衬线字体 `IBM Plex Serif`（学术报告） |
| **拟物Emoji**| 开始计时：`📈` (开盘) \| 解锁：`👑` (席位勋章) | 开始计时：`🧪` (反应) \| 解锁：`🔬` (学术奖章) |

### 2. 双主题术语映射关系

切换主题后，全页面文案及概念将同步映射转换，完美符合所选的场景设定：

| 原始功能 | 🏦 金融交易所主题 (`stock`) | 🧪 科学实验室主题 (`lab`) |
| :--- | :--- | :--- |
| **拉屎时长** | 持仓时间 / 周期 | 实验时长 / 反应时间 |
| **带薪收益** | 实盘套利 / 浮动盈亏 | 经济产出 / 合成能量 |
| **当前秒薪** | 实时报价 | 能量代谢率 |
| **记录流水** | 交易委单流水 | 实验反应日志 |
| **职级晋升** | 交易席位等级 | 科学研究职称 |
| **每周周报** | 周度行情交易研报 | 周期实验观察报告 |
| **每日运势** | 盘前波动预测 | 实验纯净宜忌黄历 |

### 3. 主题切换与无障碍动效配置

- **手动切换**：在 **个人中心** 中设有“系统视觉主题”一栏，点击即可切换；新用户在 **登录/注册页** 右上角也可快速预览切换主题。
- **GSAP 分层动效**：
  - **L1 微动效 (≤0.3s)**：点击及 Tab 切换回弹微动效。
  - **L2 入场动画 (0.5s)**：所有列表及卡片具备 staggered 交错淡入上滑进场动效。
  - **L3 沉浸动效 (持续)**：计时页内置 SVG `ProgressRing` 呼吸灯及收益 `NumberTicker` 滚动更新。
- **无障碍动效支持**：组件原生支持 `prefers-reduced-motion` 媒体查询，会自动识别用户的系统减弱动效设置，并平滑降级为无滑动的纯淡入效果，防范晕动症风险。

### 4. 7 个可复用公共组件

为了实现双主题的高质量适配，项目中提取并封装了以下 7 个核心组件：
1. [NumberTicker.vue](file:///d:/Desktop/粑粑升职记/src/components/NumberTicker.vue)：GSAP 数字插值滚动组件，支持小数精度及前后缀定义。
2. [ThemeCard.vue](file:///d:/Desktop/粑粑升职记/src/components/ThemeCard.vue)：自适应卡片卡槽，随主题环境自动切换圆角、边框与投影深度。
3. [PageTransition.vue](file:///d:/Desktop/粑粑升职记/src/components/PageTransition.vue)：Staggered 多级提速淡入页面过渡器，内置无障碍媒体检测。
4. [ProgressRing.vue](file:///d:/Desktop/粑粑升职记/src/components/ProgressRing.vue)：基于 SVG ViewBox 响应式绘图的百分比圆环，适配多端设备像素比。
5. [DataChart.vue](file:///d:/Desktop/粑粑升职记/src/components/DataChart.vue)： Canvas 自绘图表（支持 line / bar），自动匹配主题进行网格配色与填充。
6. [BadgeIcon.vue](file:///d:/Desktop/粑粑升职记/src/components/BadgeIcon.vue)：包含传说级金光呼吸动效与弹性解锁淡入的成就徽章组件。
7. [ToastPopup.vue](file:///d:/Desktop/粑粑升职记/src/components/ToastPopup.vue)：物理弹性飞入淡出的气泡消息提示器。

---

## 功能一览

| 功能 | 说明 |
|------|------|
| 带薪计时器 | 点击开始计时，实时显示已赚金额，秒薪持续增长 |
| 智能结算 | 拉完评价舒适度，自动计算本次收入 + 经验值 |
| 购买力换算 | "这次拉屎赚了一杯瑞幸！" — 拉屎收入可买什么一目了然 |
| 薪资管理 | 设置月薪/工作天数/工时，自动计算时薪和秒薪，支持变更历史 |
| 晋升系统 | 7 级职级（厕所实习生 → 厕神 CEO），经验值升级解锁 |
| 成就徽章 | 25 个成就，分普通/稀有/史诗/传说四个稀有度 |
| 数据统计 | 24h 分布图、舒适度趋势折线图、日历热力图 |
| 周报系统 | 每周自动生成拉屎报告：次数、时长、收入、购买力 |
| 年度报告 | 年度拉屎数据总结，支持分享 |
| 团队排行榜 | 创建/加入战队，周榜 PK 谁拉得多赚得多 |
| 每日运势 | 仿黄历风格，每日随机运势：幸运坑位、宜忌、神谕 |
| 健康关怀 | 久蹲（>20min）震动提醒，振动每 2 分钟重复 |
| 摸鱼电台 | 内置白噪音（流水声），沉浸式如厕体验 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | uni-app 3.0 (Vue 3 + TypeScript) |
| 状态管理 | Pinia |
| 构建工具 | Vite 6 |
| 样式 | SCSS |
| 后端 | uniCloud 阿里云（无服务器） |
| 数据库 | MongoDB（uniCloud） |
| 认证 | uni-id |
| 推送 | uni-push 2.0（个推） |
| 图表 | Canvas 自绘（兼容小程序） |

---

## 项目结构

```
粑粑升职记/
├── src/
│   ├── pages/
│   │   ├── index/            # 首页 — 一键开拉入口
│   │   ├── timer/            # 计时页面 — 带薪收入实时跳动
│   │   ├── result/           # 结算页面 — 时长/收入/舒适度评价
│   │   ├── history/          # 历史记录列表
│   │   ├── stats/            # 数据统计 — 图表可视化
│   │   ├── profile/          # 个人中心
│   │   ├── login/            # 登录注册 — 昵称+薪资设置
│   │   ├── salary/           # 薪资设置 — 变更历史
│   │   ├── rank/             # 职级晋升系统
│   │   ├── badges/           # 成就徽章墙
│   │   ├── social/           # 战队/排行榜
│   │   ├── weekly-report/    # 周报详情
│   │   └── fortune/          # 每日拉屎运势
│   ├── components/           # 可复用组件
│   ├── stores/
│   │   ├── user.ts           # 用户状态 Pinia
│   │   └── poop.ts           # 拉屎计时状态 Pinia
│   ├── services/
│   │   └── api.ts            # API 调用层 + MockServer（离线可运行）
│   ├── utils/
│   │   ├── types.ts          # 完整 TypeScript 类型定义
│   │   ├── formatters.ts     # 日期/时长格式化函数
│   │   └── salary-calculator.ts  # 薪资计算逻辑
│   ├── styles/
│   │   └── variables.scss    # 全局 SCSS 变量
│   └── pages.json            # 路由与 TabBar 配置
├── uniCloud-aliyun/
│   ├── cloudfunctions/       # 7 个云函数
│   │   ├── user-center/          # 用户注册/薪资管理
│   │   ├── session-manager/      # 如厕记录 CRUD
│   │   ├── achievement-checker/  # 成就检测与徽章颁发
│   │   ├── report-generator/     # 周报/年报生成
│   │   ├── group-manager/        # 团队与排行榜
│   │   ├── push-scheduler/       # 定时推送任务
│   │   └── db-init/              # 数据库种子数据初始化
│   ├── database/             # MongoDB Schema 定义（7 个集合）
│   └── common/               # 服务端共享模块
│       ├── salary-calc.js
│       ├── badge-definitions.js
│       ├── utils.js
│       └── validators.js
└── docs/
    └── api-spec.md           # 完整 API 接口文档
```

---

## 快速开始（前端开发）

### 环境要求

- Node.js >= 18
- npm >= 9
- HBuilderX（可选，推荐用于 uni-app 开发）

### 安装依赖

```bash
npm install
```

### 运行 H5（浏览器预览）

```bash
npm run dev:h5
```

浏览器打开 `http://localhost:5173` 即可预览。

### 运行微信小程序

```bash
npm run dev:mp-weixin
```

然后用微信开发者工具打开 `dist/dev/mp-weixin` 目录。

### TypeScript 类型检查

```bash
npm run type-check
```

---

## 离线运行说明

项目内置了 **MockServer**（`src/services/api.ts`），可以在不部署 uniCloud 后端的情况下完整运行：

- 所有 API 请求自动走本地 Mock 数据库（使用 `uni.setStorageSync` 持久化）
- 预置了 30 天的模拟如厕数据
- 首次打开自动跳转登录页，填完薪资即可使用全部功能
- 切换为真实后端只需在 `api.ts` 中配置 `USE_MOCK = false`

---

## 后端部署（uniCloud）

### 前置条件

1. 注册 [DCloud 开发者账号](https://dev.dcloud.net.cn/)
2. 在 HBuilderX 中开通 uniCloud 并创建阿里云服务空间
3. 将服务空间关联到此项目

### 1. 部署数据库 Schema

在 HBuilderX 中，右键 `uniCloud-aliyun/database/` 目录 → 上传所有 Schema。

或使用命令行：

```bash
# 安装 uniCloud CLI
npm install -g @dcloudio/uni-cli

# 部署数据库索引
npx uni-cloud deploy --project uniCloud-aliyun
```

### 2. 上传云函数

在 HBuilderX 中，右键 `uniCloud-aliyun/cloudfunctions/` 目录 → 上传所有云函数。

注意上传顺序：
1. 先上传 `common` 公共模块（会自动跟随云函数上传）
2. 再上传所有云函数

### 3. 初始化种子数据

打开微信小程序（或 H5），在控制台执行：

```js
// 初始化徽章数据（仅需执行一次）
uniCloud.callFunction({
  name: 'achievement-checker',
  data: { action: 'seedBadges', params: {} }
}).then(res => console.log('徽章初始化:', res))

// 初始化商品价格表（仅需执行一次）
uniCloud.callFunction({
  name: 'db-init',
  data: { action: 'seedPurchaseItems', params: {} }
}).then(res => console.log('商品初始化:', res))
```

### 4. 配置 uni-push（用于周报推送）

在 HBuilderX 中：`manifest.json` → `uni-push` → 开通推送服务，按引导在个推后台配置厂商通道。

### 5. 配置定时任务

在 uniCloud 控制台 → 云函数 → `push-scheduler` → 配置定时触发器：

- 每周一 09:00 触发周报生成
- Cron 表达式：`0 0 9 * * 1`

---

## 构建与发布

### 构建 H5

```bash
npm run build:h5
```

输出目录：`dist/build/h5/`，可部署到 uniCloud 前端网页托管或任意静态服务器。

### 构建微信小程序

```bash
npm run build:mp-weixin
```

输出目录：`dist/build/mp-weixin/`，用微信开发者工具打开并上传审核。

### 构建 Android/iOS App

```bash
npm run build:app
```

输出目录：`dist/build/app/`，然后用 HBuilderX → 发行 → 原生 App 云打包。

---

## 配置指南

### 微信小程序 appid

在 `src/manifest.json` → `mp-weixin.appid` 中填入你的微信小程序 appid。

### 全局样式变量

在 `src/styles/variables.scss` 中定义，包括主题色、圆角、阴影等，按需修改。

### 薪资计算逻辑

前后端共用相同算法：

```
时薪 = 月薪 / 月工作天数 / 日工作小时数
秒薪 = 时薪 / 3600
本次收入 = 秒薪 × 如厕秒数
```

---

## API 文档

完整 API 接口文档见 [`docs/api-spec.md`](docs/api-spec.md)，包含 7 个云函数、20+ 接口的详细入参出参说明。

---

## 开发路线图

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 0 | 项目搭建、数据库Schema、种子数据 | ✅ |
| Phase 1 | MVP — 核心计时、结算、历史、薪资、基础图表 | ✅ |
| Phase 2 | 数据可视化、周报、晋升系统、成就徽章 | ✅ |
| Phase 3 | 社交协同（战队/排行榜/分享）、健康关怀、运势 | ✅ |
| Phase 4 | iOS/Android 原生编译发布、数据导出 | ⏳ |

---

## 协议

MIT License — 纯趣味工具，仅供娱乐。
