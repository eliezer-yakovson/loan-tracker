import type { AppState, Category, LoanFormState, MonthEntry } from './types';

export const STORAGE_KEY = 'loan-tracker-board-v1';

export function getCurrentMonthKey(): string {
  return toMonthKey(new Date());
}

export function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return toMonthKey(date);
}

export function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month, 1);
  return toMonthKey(date);
}

export function compareMonthKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

export function enumerateMonths(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = startMonth;
  while (compareMonthKeys(current, endMonth) <= 0) {
    months.push(current);
    current = getNextMonthKey(current);
  }
  return months;
}

export function monthKeyFromDate(dateString: string): string {
  if (!dateString) return getCurrentMonthKey();
  return dateString.slice(0, 7);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('he-IL').format(new Date(dateString));
}

export function formatMonthLabel(monthKey: string): string {
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
    new Date(`${monthKey}-01T00:00:00`),
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function makeEntryKey(monthKey: string, loanId: string): string {
  return `${monthKey}::${loanId}`;
}

export function createEmptyState(): AppState {
  return {
    selectedMonth: getCurrentMonthKey(),
    categories: [],
    loans: [],
    monthEntries: {},
  };
}

export function createLoanForm(monthKey: string): LoanFormState {
  return {
    name: '',
    lenderName: '',
    originalAmount: '',
    monthlyAmount: '',
    totalPayments: '',
    takenDate: `${monthKey}-01`,
    monthlyDueDay: '1',
    notes: '',
    partialPercentage: '100',
  };
}

export function normalizeState(value: unknown): AppState {
  const emptyState = createEmptyState();
  if (!value || typeof value !== 'object') return emptyState;
  const candidate = value as Partial<AppState>;
  return {
    selectedMonth:
      typeof candidate.selectedMonth === 'string'
        ? candidate.selectedMonth
        : emptyState.selectedMonth,
    categories: Array.isArray(candidate.categories) ? (candidate.categories as Category[]) : [],
    loans: Array.isArray(candidate.loans) ? (candidate.loans as AppState['loans']) : [],
    monthEntries:
      candidate.monthEntries && typeof candidate.monthEntries === 'object'
        ? (candidate.monthEntries as Record<string, MonthEntry>)
        : {},
  };
}

export function ensureMonthEntries(state: AppState, selectedMonth: string): AppState {
  let monthEntries = state.monthEntries;
  let changed = state.selectedMonth !== selectedMonth;

  for (const loan of state.loans) {
    if (loan.isFrozen) continue; // frozen loans don't get new entries
    const startMonth = monthKeyFromDate(loan.takenDate);
    if (compareMonthKeys(startMonth, selectedMonth) > 0) continue;

    for (const monthKey of enumerateMonths(startMonth, selectedMonth)) {
      const entryKey = makeEntryKey(monthKey, loan.id);
      if (monthEntries[entryKey]) continue;

      const previousMonth = getPreviousMonthKey(monthKey);
      const previousEntry = monthEntries[makeEntryKey(previousMonth, loan.id)];
      const installmentNumber = previousEntry ? previousEntry.installmentNumber + 1 : 1;

      if (installmentNumber > loan.totalPayments) break;

      if (!changed) {
        monthEntries = { ...monthEntries };
        changed = true;
      }

      const baseAmount = loan.monthlyAmount * ((loan.partialPercentage ?? 100) / 100);
      monthEntries[entryKey] = {
        loanId: loan.id,
        monthKey,
        amount: previousEntry ? previousEntry.amount : baseAmount,
        installmentNumber,
        confirmed: false,
        manuallyEdited: false,
      };
    }
  }

  if (!changed) return state;
  return { ...state, selectedMonth, monthEntries };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return createEmptyState();
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return createEmptyState();
    return ensureMonthEntries(normalizeState(JSON.parse(rawValue)), getCurrentMonthKey());
  } catch {
    return createEmptyState();
  }
}
