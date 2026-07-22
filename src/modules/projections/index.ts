// Public API for projections module (AD-010, AD-016)
// All imports from other modules must come through this file

// Domain: types and helpers
export type { MonthlyProjection } from "./domain/types";
export { parseMonthParam, getCurrentMonth, previousMonth, nextMonth, formatMonthLabel } from "./domain/month";

// Services: composition
export { getMonthlyProjection } from "./services/get-monthly-projection";

// Components: UI
export { ProjectionSummary } from "./components/ProjectionSummary";
export { MonthNavigator } from "./components/MonthNavigator";
