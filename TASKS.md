# Master Task List (TASKS.md) - Mobile App (Expo)

## Phase 0 — Discovery
- [x] Web and Browser subagent discovery of reference features.
- [x] Pivot plan to React Native + Expo.
- [x] Deliver detailed Mobile Phase 0 Discovery Report (`implementation_plan.md`).
- [x] Wait for user review and approval.

## Phase 1 — Project Foundation
- [x] Initialize Expo app using React Native, TypeScript, and file-based Expo Router.
- [x] Install and configure NativeWind (Tailwind CSS for React Native) v4.
- [x] Set up empty directory structure (`/app`, `/components`, `/features`, `/hooks`, `/lib`, `/services`, `/store`, `/types`).
- [x] Implement responsive shell layouts with bottom tabs navigation header and theme settings.
- [x] Verify build compiles on Expo Go with zero TypeScript/lint errors.

## Phase 2 — Design System
- [x] Build reusable styled NativeWind components: Buttons, Cards, Inputs, List views, Chart wrappers, Bottom Sheets (Dialogs), Badges, Skeleton loaders.
- [x] Create a Storybook-style mock screen inside the app layout to playground-test all custom UI elements.

## Phase 3 — Data Models
- [x] Create TypeScript types/interfaces for all models (Accounts, Transactions, Budgets, Goals, AI chat).
- [x] Write Zod validation schemas for mobile input forms.
- [x] Generate local mock JSON payloads for database simulation.

## Phase 4 — Static Pages
- [x] Recreate all dashboard, ledger, budget progress, goals tracker, settings, and welcome screens visually.
- [x] Use only mock data locally to populate views (no network or SQLite database integrations).

## Phase 5 — Authentication
- [x] Integrate Clerk Expo authentication.
- [x] Implement register, login, and Google OAuth screens.
- [x] Configure routing authentication guard middlewares.

## Phase 6 — Backend Foundation
- [x] Set up local persistence database client (Expo SQLite) or establish cloud connection client.
- [x] Implement clean service-repository schemas for offline support.

## Phase 7 — Core Features
- [x] Build Core Accounts Management (CRUD manual cards).
- [x] Build Core Transactions Ledger (CRUD entries, local attachment scanner).
- [x] Build Core Budget Limits (visual meters, local alert warnings).
- [x] Build Savings Goals.
- [x] Build Floating AI Assistant Bottom Sheet (Hono/Gemini API backend call).

## Phase 8 — Dashboards
- [x] Build summary statistics widgets.
- [x] Build spending breakdown charts (react-native-gifted-charts Pie chart).
- [x] Build income/expense trends graphs (react-native-gifted-charts Area chart).

## Phase 9 — Integrations
- [ ] Add CSV export/import utility.
- [ ] Setup image scanner trigger for receipts.

## Phase 10 — Performance
- [ ] Optimize image loading, flat list memoization, and MMKV cache response rates.
- [ ] Generate mobile performance diagnostics report.

## Phase 11 — Testing
- [ ] Write unit tests for local storage hooks and filters.
- [ ] Write E2E/integration tests using Maestro/Detox (minimum 80% coverage).

## Phase 12 — Deployment
- [ ] Configure Expo EAS credentials and configuration files (`app.json`, `eas.json`).
- [x] Generate Android build packages (.apk / .aab) and iOS build configurations (successfully built release APK).
- [ ] Generate final deployment checklist.
