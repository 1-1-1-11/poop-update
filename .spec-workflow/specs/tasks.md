# Tasks Document

## Task Checklist

### Phase 1: API & Store Infrastructure

- [x] **1. Create Double-Mode API Client**
  - File: `src/services/api.ts`
  - Implement `apiCall` wrapper which tries to call `uniCloud.callFunction` and fallbacks to `MockServer` upon failure.
  - Implement `MockServer` class to simulate cloud database tables (`users`, `poop-sessions`, `weekly-reports`, `groups`, `badges`) inside LocalStorage.
  - Inject 20+ mock historical sessions and 3 active team members when Mock database is empty.
  - _Leverage: docs/api-spec.md_
  - _Requirements: 1.1_
  - _Success Criteria: `apiCall` handles user registration and saves data to LocalStorage mock database when uniCloud fails._

- [x] **2. Create User State Store**
  - File: `src/stores/user.ts`
  - Manage active user profile state, including setting adjustments (BGM, sound, long-sit minutes), salary data, and current rank level.
  - _Leverage: src/utils/salary-calculator.ts_
  - _Requirements: 1.2_
  - _Success Criteria: Pinia store initialized, state matches type definitions in `src/utils/types.ts`._

- [x] **3. Create Poop State Store**
  - File: `src/stores/poop.ts`
  - Manage active timer state (start time, seconds elapsed, current earnings) and handle loading/saving session logic.
  - _Requirements: 2.2_
  - _Success Criteria: Store handles starting timer, periodic tick updates, and calling API to save poop sessions._

- [x] **4. Create Tab Bar Icon Generator Script**
  - File: `scripts/generate-icons.js`
  - Write a Node.js utility script that generates simple PNG icon images representing tab icons (Home, History, Stats, User) in standard and active states, saving them to `src/static/images/`.
  - _Success Criteria: Run script to generate all 8 PNG icons, enabling Tabbar rendering in WeChat mini-program and H5 modes._

---

### Phase 2: Page Core Implementations

- [x] **5. Implement Registration/Login Page**
  - File: `src/pages/login/index.vue`
  - Draw welcoming form for inputting nickname, monthly salary, and work hour settings. Redirect unregistered users here.
  - _Requirements: Requirement 1_
  - _Success Criteria: Form validates entries and successfully triggers user registration, transitioning to the Home screen._

- [x] **6. Implement Dashboard Home Page**
  - File: `src/pages/index/index.vue`
  - Implement glowing console displaying user statistics (earnings today, poop counts), rank progress bar, and the large pulsing "开始拉屎" button.
  - _Requirements: Requirement 2_
  - _Success Criteria: Page renders dynamically, showing current XP progress and today's accumulated earnings. Clicking start navigates to timer._

- [x] **7. Implement Immersive Timer Page**
  - File: `src/pages/timer/index.vue`
  - Create full-screen dark timer with real-time wage counter incrementing every second. Include long-sit warning and vibration feedback.
  - _Requirements: Requirement 3_
  - _Success Criteria: Counter ticks accurately. Long sit warning displays when duration exceeds the limit._

- [x] **8. Implement Result Page with Level Up Overlay**
  - File: `src/pages/result/index.vue`
  - Create checkout form displaying poop summary, Luoxiang coffee equivalent, comfort rating selector, notes memo, and full-screen Level Up card modal.
  - _Requirements: Requirement 4_
  - _Success Criteria: Session successfully saved through PoopStore. Shows appropriate fireworks/encouragement animation depending on duration._

- [x] **9. Implement History List Page**
  - File: `src/pages/history/index.vue`
  - Display lifetime totals, filter records by date range, and render detailed session cards along an interactive timeline.
  - _Requirements: Requirement 5_
  - _Success Criteria: Timeline renders all previous records; date filtering updates list instantly._

- [x] **10. Implement Custom Statistics Page**
  - File: `src/pages/stats/index.vue`
  - Draw custom 24-hour bar chart, week-by-week average comfort SVG line graph, and calendar heatmap of poop frequencies.
  - _Requirements: Requirement 5_
  - _Success Criteria: Graphs scale dynamically based on selected period (week/month/year) without rendering issues on mobile dimensions._

---

### Phase 3: Secondary Features & Polishing

- [x] **11. Implement Profile settings Page**
  - File: `src/pages/profile/index.vue`
  - Implement user settings page containing slide toggles for BGM/sound effects, long-sit minutes adjustment, and profile details.
  - _Requirements: Requirement 7_
  - _Success Criteria: Toggles correctly alter state in UserStore and persist configurations on saving._

- [x] **12. Implement Salary Settings and History Page**
  - File: `src/pages/salary/index.vue`
  - Implement salary adjustment panel and list history of previous salary packages with annotations.
  - _Requirements: Requirement 1_
  - _Success Criteria: Allows changing salary structure, adding history records, and automatically adjusting the calculated hourly rate._

- [x] **13. Implement Ranks Level Page**
  - File: `src/pages/rank/index.vue`
  - Draw 7 ranks progression list indicating which ranks are currently unlocked and XP needed to reach next tier.
  - _Requirements: Requirement 4_
  - _Success Criteria: Highlights active rank correctly._

- [x] **14. Implement Achievements Badges Page**
  - File: `src/pages/badges/index.vue`
  - Display grid of earned and locked achievements, unlocking appropriate descriptions on selection.
  - _Requirements: Requirement 6_
  - _Success Criteria: Shows unlocked achievements in color and locked ones in grey._

- [x] **15. Implement Social Team Page**
  - File: `src/pages/social/index.vue`
  - Render Join/Create team screens, week-based earnings rankings, and activity bulletin board.
  - _Requirements: Requirement 7_
  - _Success Criteria: Shows rankings correct matching teammates' contributions, and dynamically lists recent activities._

- [x] **16. Implement Weekly Report Page**
  - File: `src/pages/weekly-report/index.vue`
  - Create swipable weekly recap card showing earnings summary, consumption equivalents, and humorous evaluation remarks.
  - _Requirements: Requirement 8_
  - _Success Criteria: Weekly report data calculated properly and presented in a card carousel format._

- [x] **17. Implement Fortune Page**
  - File: `src/pages/fortune/index.vue`
  - Generate daily poop luck index, optimal toilet time recommendation, and humorous DOs & DONTs guidelines.
  - _Requirements: Requirement 8_
  - _Success Criteria: Generates unique predictions based on current date calendar._

---

### Phase 4: Final verification

- [x] **18. Compile and Type-Check Application**
  - Run type-checker and compile production H5 bundle to verify syntax correctness.
  - Commands: `npm run type-check` and `npm run build:h5`.
  - _Success Criteria: Zero compilation or TypeScript type errors._
