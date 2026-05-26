# Technology Stack

## Project Type
这是一个跨平台的移动端应用程序（使用 uni-app 开发），优先兼容 **微信小程序 (mp-weixin)**，同时支持 **H5 (Web)** 用于开发调试。

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript (ECMAScript 2022) / HTML5 / CSS3 / SCSS
- **Runtime/Compiler**: Node.js v18+, Vite v6, TS v5.7, vue-tsc v2
- **Language-specific tools**: npm, Vite (构建与热更新)

### Key Dependencies/Libraries
- **Framework**: `uni-app` (基于 Vue 3, 版本：`3.0.0-4060620250520001`)
- **State Management**: `Pinia` (Vue 3 官方状态管理库, 版本 `^3.0.2`)
- **CSS Preprocessor**: `Sass` (用于 SCSS 变量、嵌套和混入)

### Application Architecture
本应用使用分层架构：
1. **Presentation Layer (视图层)**：Vue 3 单文件组件 (SFC)，包含模板、逻辑（Script Setup）及作用域样式（Scoped SCSS）。
2. **State Management Layer (状态管理层)**：使用 Pinia 进行全局状态隔离，划分 `userStore` (用户信息、设置、薪资) 和 `poopStore` (当前计时状态、历史记录、统计数据)。
3. **Service Layer (数据访问/API 层)**：设计双模 API 客户端 `api.ts`。在存在 `uniCloud` 云空间的环境中调用远程云函数；在无云空间或浏览器开发调试环境中自动降级到 LocalStorage 本地模拟数据库，并内置丰富的 mock 初始化数据。
4. **Backend (后端云服务层)**：基于 `uniCloud 阿里云` 平台构建。
   - 数据库：uni-app 提供的 NoSQL 云数据库（包含 users, poop-sessions, badges, groups, weekly-reports 集合）。
   - 云函数：`user-center`、`session-manager`、`achievement-checker`、`report-generator`、`group-manager`。

### Data Storage
- **Primary Database**: uniCloud 云数据库 (NoSQL) 或浏览器 `LocalStorage` (本地离线降级)。
- **Mock Data**: 本地首次初始化时自动注入大量的历史拉屎记录、团队同事数据，以使 UI 填充饱满。

## Development Environment

### Build & Development Tools
- **Build System**: Vite (通过 `npm run dev:h5` 或 `npm run build:h5` 调用)
- **Code Quality**: `vue-tsc` 进行 TypeScript 类型静态检查。
- **Styling Standards**: 使用 `variables.scss` 中定义的主题色（暖橙色）、圆角、阴影及字号作为设计系统规范。

## Technical Requirements & Constraints

### Performance Requirements
- **图表渲染**：使用 **uCharts**（专为 uni-app 打造的轻量图表库）绘制统计图表，兼顾开发效率和渲染性能。日历热力图可使用纯 CSS Grid 实现。
- **动画**：使用 **Lottie** (lottie-miniprogram) 实现卡通动画（计时中、结算、升级、夸奖、鼓励），CSS transition 用于轻量级微交互。
- **数据持久化**：本地离线降级模式需在数据发生变动时同步写入 `uni.setStorageSync`，防止用户刷新导致记录丢失。

### Compatibility Requirements
- **平台支持**：H5 浏览器（包含各移动端浏览器和内置 Webview），微信小程序（基础库版本 >= 2.20.0）。
- **响应式**：主要采用 `rpx` 单位，确保在各类宽高不一的手机屏幕上均能完美自适应。

### Security & Privacy
- **认证体系**：云开发模式使用 **uni-id-common** 的 `checkToken` 机制解析用户身份（`context.UNIID_TOKEN`）。前端通过 `uni-id-pages` 或自定义登录页完成微信授权登录，获取 token 后自动附带到所有云函数调用中。
- **数据库权限**：所有集合的 `create/update/delete` 均设为 `false`（仅允许云函数操作），`read` 限定为 `doc.user_id == auth.uid` 或 `doc._id == auth.uid`。
- **防止泄密**：提供匿名拉屎设置开关。用户薪资数据不通过客户端直接查询，仅通过云函数返回脱敏后的个人信息。
