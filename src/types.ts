export type Page = 'dashboard' | 'loans' | 'manage' | 'history' | 'user' | 'admin';

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  token: string;
  isAdmin?: boolean;
};

export type Category = {
  id: string;
  name: string;
};

export type Loan = {
  id: string;
  categoryId: string;
  name: string;
  lenderName: string;
  originalAmount: number;
  monthlyAmount: number;
  totalPayments: number;
  takenDate: string;
  monthlyDueDay: number;
  notes: string;
  isFrozen: boolean;
  partialPercentage: number;
};

export type MonthEntry = {
  loanId: string;
  monthKey: string;
  amount: number;
  installmentNumber: number;
  confirmed: boolean;
  manuallyEdited: boolean;
};

export type AppState = {
  selectedMonth: string;
  categories: Category[];
  loans: Loan[];
  monthEntries: Record<string, MonthEntry>;
};

export type LoanFormState = {
  name: string;
  lenderName: string;
  originalAmount: string;
  monthlyAmount: string;
  totalPayments: string;
  takenDate: string;
  monthlyDueDay: string;
  notes: string;
  partialPercentage: string;
};
