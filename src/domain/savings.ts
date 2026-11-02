import type { SavingsEntry, SavingsGoal } from '@/domain/types';
import { percent } from '@/lib/money';

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
