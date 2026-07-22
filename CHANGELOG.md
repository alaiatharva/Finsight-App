# Changelog

All notable changes to the FinSight project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2026-06-06

### Added
- Completed Phase 8 Dashboards visualizations.
- Installed `react-native-svg` and `react-native-gifted-charts` packages.
- Redesigned home dashboard ([index.tsx](file:///d:/Capstone/App/src/app/(tabs)/index.tsx)) to calculate monthly inflow/outflow balance aggregates.
- Built spending category breakdown donut `PieChart` visual with custom legend items.
- Built outflow trend daily `BarChart` visual showing transaction volume patterns over the past 7 days.
- Verified compilation with zero type errors.

## [0.11.0] - 2026-06-06

### Added
- Completed Phase 7 Core Features (Feature 5: AI Chatbot Overlay).
- Wrapped bottom tabs layout shell in global View container with an absolute floating Sparkles bubble button.
- Designed dynamic conversation messages history state inside slide-up `Drawer` bottom panel.
- Programmed smart local AI query parser that intercepts keyword inquiries for aggregate net worth, monthly spending breakdown, budget consumption boundaries, and savings target milestones, directly querying SQLite repositories.
- Integrated quick actions selector pills allowing user typing bypass options.
- Added typing simulation delay to enhance visual flow.

## [0.10.0] - 2026-06-06

### Added
- Completed Phase 7 Core Features (Feature 4: Savings Goals).
- Wired `goals.tsx` screen to fetch savings targets dynamically from `GoalRepository`.
- Built Zod form input validation using `GoalSchema` for adding new goals.
- Added a dynamic deposit sub-dialog form letting users log savings updates.
- Configured milestone status checks that mark a goal as completed once the target amount is achieved.

## [0.9.0] - 2026-06-06

### Added
- Completed Phase 7 Core Features (Feature 3: Budgets Management).
- Integrated `budgets.tsx` screen with dynamic budget limits from `BudgetRepository` and actual month expense calculations from `TransactionRepository`.
- Built Zod form input validation using `BudgetSchema`.
- Implemented category selector modal in the budget limit editor.
- Designed dynamic progress breach warning indicators.

## [0.8.0] - 2026-06-06

### Added
- Completed Phase 7 Core Features (Feature 2: Transactions Ledger CRUD).
- Wired `transactions.tsx` screen to SQLite database via `TransactionRepository` and `AccountRepository`.
- Built Zod form input validation using `TransactionSchema`.
- Implemented category and account selection modals for mobile responsiveness.
- Added transaction details sheet with a deletion action that restores the account balance dynamically.
- Linked Dashboard/Home tab screen to load live accounts and transaction details dynamically on screen focus.

## [0.7.0] - 2026-06-06

### Added
- Completed Phase 6 Backend Foundation.
- Installed native `expo-sqlite` package.
- Created local SQLite database schema initializer (`src/lib/db.ts`) with tables:
  - `accounts`
  - `transactions` with cascade deletion constraints on accounts
  - `budgets`
  - `goals`
- Implemented **Repository Pattern** (`src/services/db-repositories.ts`) declaring:
  - `AccountRepository` (getAll, create, delete)
  - `TransactionRepository` (getAll, create with atomic account balance delta updates in Transaction, delete with atomic account balance recovery)
  - `BudgetRepository` (getAll, setLimit upserts)
  - `GoalRepository` (getAll, create, updateProgress)
- Mapped in-memory custom fallbacks for complete Web previews execution compatibility.
- Verified TypeScript compilation compiles successfully.
