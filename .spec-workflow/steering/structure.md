# Project Structure

## Directory Organization

```
baba-promotion/
├── .spec-workflow/         # 多 Agent 协同规范与文档 (Steering & Specs)
├── uniCloud-aliyun/        # 后端云函数与数据库 Schema
│   ├── cloudfunctions/     # 云函数源码
│   │   ├── achievement-checker/  # 徽章检查云函数
│   │   ├── group-manager/        # 战队管理云函数
│   │   ├── report-generator/     # 周报/年报生成云函数
│   │   ├── session-manager/      # 如厕记录云函数
│   │   └── user-center/          # 用户中心云函数
│   ├── common/             # 共享的 Nodejs 工具（薪资计算等）
│   └── database/           # DB Schema 文件 (.schema.json)
└── src/                    # 前端核心源码
    ├── components/         # 公共可复用 UI 组件（空闲时补充）
    ├── composables/        # 组合式函数（空闲时补充）
    ├── pages/              # 页面视图 (SFC Vue)
    │   ├── index/          # 首页 (带薪拉屎控制台)
    │   ├── timer/          # 计时页 (努力拉屎中)
    │   ├── result/         # 结算页 (收益与评价手记)
    │   ├── history/        # 记录页 (如厕足迹列表)
    │   ├── stats/          # 统计页 (24小时分布, 舒适趋势, 热力图)
    │   ├── profile/        # 个人中心页 (各项设置与入口)
    │   ├── login/          # 注册登录页 (初始化薪资参数)
    │   ├── salary/         # 薪资变更历史页
    │   ├── rank/           # 我的职级展示页
    │   ├── badges/         # 解锁徽章展示页
    │   ├── social/         # 战队与动态排行页
    │   ├── weekly-report/  # 周报详情滑动卡片页
    │   └── fortune/        # 今日屎运运势页
    ├── static/             # 静态资源 (图片、声音、Lottie 等)
    │   ├── images/         # Tabbar、等级、商品等图标
    │   ├── lottie/         # 升级和结算动画
    │   └── sounds/         # 提示音效
    ├── stores/             # Pinia 状态树
    │   ├── user.ts         # 用户全局状态 store
    │   └── poop.ts         # 拉屎计时与历史 store
    ├── styles/             # 样式库
    │   └── variables.scss  # 全局 SCSS 变量、设计 Token
    ├── utils/              # 前端辅助逻辑函数
    │   ├── types.ts        # 全局 TypeScript 接口定义
    │   ├── badge-definitions.ts # 徽章解锁阈值与 XP 奖励定义
    │   ├── purchase-items.ts    # 换算实体商品列表及计算函数
    │   └── salary-calculator.ts # 时薪/秒薪/结算 XP 与职级评定算法
    ├── App.vue             # 应用生命周期管理与全局公共样式
    ├── main.ts             # 应用入口及 Pinia 挂载
    ├── pages.json          # 页面路由与全局 TabBar 配置
    └── manifest.json       # 各端打包配置、云空间绑定
```

## Naming Conventions

### Files
- **页面/组件文件夹**：小写字母，单词间使用中划线（例如 `weekly-report`）。
- **Vue 组件/页面**：一般使用 `index.vue`（在专属文件夹下）或 `PascalCase`（可复用组件，例如 `DottedLine.vue`）。
- **TS/JS 代码文件**：使用 `kebab-case`（例如 `salary-calculator.ts`）。

### Code
- **接口 (Interfaces)**：使用 `PascalCase`（例如 `PoopSession`、`User`）。
- **函数与变量**：使用 `camelCase`（例如 `calculateEarnings`、`currentLevel`）。
- **常量**：使用 `UPPER_SNAKE_CASE`（例如 `TITLE_LEVELS`、`PURCHASE_ITEMS`）。

## Import Patterns
- 所有的公共资源和代码使用相对路径（例如 `../../utils/types`）或使用 Vite 的别名配置。
- 引入 SCSS 变量通过在 `App.vue` 或 `uni.scss` 中全局 import。
- 保持外部依赖、本地组件、状态 Store、工具库及样式资源的导入顺序。
