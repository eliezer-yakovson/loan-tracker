import type { AppState, Loan, MonthEntry } from './types';
import { makeEntryKey } from './utils';
import { logError } from './errorLogApi';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ── Wire types (backend snake_case) ───────────────────────────────────────────

interface ApiLoan {
  id: string;
  category_id: string;
  name: string;
  lender_name: string;
  original_amount: number;
  monthly_amount: number;
  total_payments: number;
  taken_date: string;
  monthly_due_day: number;
  notes: string;
  is_frozen: boolean;
  partial_percentage: number;
}

interface ApiMonthEntry {
  id: string;
  loan_id: string;
  month_key: string;
  amount: number;
  installment_number: number;
  confirmed: boolean;
  manually_edited: boolean;
}

interface ApiStateOut {
  selected_month: string;
  categories: Array<{ id: string; name: string }>;
  loans: ApiLoan[];
  month_entries: ApiMonthEntry[];
}

interface ApiStateIn {
  selected_month: string;
  categories: Array<{ id: string; name: string }>;
  loans: ApiLoan[];
  month_entries: Omit<ApiMonthEntry, 'id'>[];
}

// ── Converters ────────────────────────────────────────────────────────────────

function apiLoanToLoan(api: ApiLoan): Loan {
  return {
    id: api.id,
    categoryId: api.category_id,
    name: api.name,
    lenderName: api.lender_name,
    originalAmount: Number(api.original_amount),
    monthlyAmount: Number(api.monthly_amount),
    totalPayments: api.total_payments,
    takenDate: api.taken_date,
    monthlyDueDay: api.monthly_due_day,
    notes: api.notes,
    isFrozen: api.is_frozen ?? false,
    partialPercentage: Number(api.partial_percentage ?? 100),
  };
}

function loanToApiLoan(loan: Loan): ApiLoan {
  return {
    id: loan.id,
    category_id: loan.categoryId,
    name: loan.name,
    lender_name: loan.lenderName,
    original_amount: loan.originalAmount,
    monthly_amount: loan.monthlyAmount,
    total_payments: loan.totalPayments,
    taken_date: loan.takenDate,
    monthly_due_day: loan.monthlyDueDay,
    notes: loan.notes,
    is_frozen: loan.isFrozen,
    partial_percentage: loan.partialPercentage,
  };
}

function apiEntryToEntry(api: ApiMonthEntry): MonthEntry {
  return {
    loanId: api.loan_id,
    monthKey: api.month_key,
    amount: Number(api.amount),
    installmentNumber: api.installment_number,
    confirmed: api.confirmed,
    manuallyEdited: api.manually_edited,
  };
}

function entryToApiEntry(entry: MonthEntry): Omit<ApiMonthEntry, 'id'> {
  return {
    loan_id: entry.loanId,
    month_key: entry.monthKey,
    amount: entry.amount,
    installment_number: entry.installmentNumber,
    confirmed: entry.confirmed,
    manually_edited: entry.manuallyEdited,
  };
}

function apiStateToAppState(api: ApiStateOut): AppState {
  const monthEntries: Record<string, MonthEntry> = {};
  for (const e of api.month_entries) {
    monthEntries[makeEntryKey(e.month_key, e.loan_id)] = apiEntryToEntry(e);
  }
  return {
    selectedMonth: api.selected_month,
    categories: api.categories,
    loans: api.loans.map(apiLoanToLoan),
    monthEntries,
  };
}

function appStateToApiStateIn(state: AppState): ApiStateIn {
  return {
    selected_month: state.selectedMonth,
    categories: state.categories,
    loans: state.loans.map(loanToApiLoan),
    month_entries: Object.values(state.monthEntries).map(entryToApiEntry),
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function pullState(selectedMonth: string): Promise<AppState> {
  try {
    const res = await fetch(`${API_BASE}/sync?selected_month=${encodeURIComponent(selectedMonth)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = `Pull failed: ${res.status}`;
      await logError('sync/pull', err, { status: res.status, month: selectedMonth });
      throw new Error(err);
    }
    const data: ApiStateOut = await res.json();
    return apiStateToAppState(data);
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('Pull failed'))) {
      await logError('sync/pull', String(e), { month: selectedMonth });
    }
    throw e;
  }
}

export async function pushState(state: AppState): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(appStateToApiStateIn(state)),
    });
    if (!res.ok) {
      const err = `Push failed: ${res.status}`;
      await logError('sync/push', err, { status: res.status });
      throw new Error(err);
    }
  } catch (e) {
    if (!(e instanceof Error && e.message.startsWith('Push failed'))) {
      await logError('sync/push', String(e));
    }
    throw e;
  }
}
