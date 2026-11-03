import type { SavingsEntry, SavingsGoal } from '@/domain/types';
import { percent } from '@/lib/money';
import { monthKey } from '@/lib/dates';

export interface SavingsSummary {
  goal: SavingsGoal;
  currentMinor: number;
  remainingMinor: number;
  progress: number;
}

export function savingsGoalAmount(goal: SavingsGoal, entries: SavingsEntry[]): number {
  return entries
    .filter((entry) => entry.goalId === goal.id)
    .reduce((total, entry) => total + entry.amountMinor, goal.startingMinor);
}

export function savingsSummary(goal: SavingsGoal, entries: SavingsEntry[]): SavingsSummary {
  const currentMinor = Math.max(0, savingsGoalAmount(goal, entries));
  return {
    goal,
    currentMinor,
    remainingMinor: Math.max(0, goal.targetMinor - currentMinor),
    progress: percent(currentMinor, goal.targetMinor),
  };
}

export function totalSavingsMinor(goals: SavingsGoal[], entries: SavingsEntry[]): number {
  return goals
    .filter((goal) => !goal.archived)
    .reduce((total, goal) => total + Math.max(0, savingsGoalAmount(goal, entries)), 0);
}

export function contributedThisMonthMinor(
  goal: SavingsGoal,
  entries: SavingsEntry[],
  today: string,
): number {
  const current = monthKey(today);
  return entries
    .filter((entry) => entry.goalId === goal.id && monthKey(entry.date) === current)
    .reduce((total, entry) => total + entry.amountMinor, 0);
}

/**
 * A suggestion only: Harbor never moves money on its own. The monthly target
 * wins when set, otherwise a percentage of this month's received income.
 */
export function suggestedSetAsideMinor(
  goal: SavingsGoal,
  incomeThisMonthMinor: number,
  contributedMinor: number,
): number {
  const target =
    goal.monthlyTargetMinor > 0
      ? goal.monthlyTargetMinor
      : goal.autoSavePercent > 0
        ? Math.round((incomeThisMonthMinor * goal.autoSavePercent) / 100)
        : 0;
  return Math.max(0, Math.round(target) - contributedMinor);
}
