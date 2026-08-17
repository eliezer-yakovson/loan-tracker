import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AppState, AuthUser, Category, Loan, MonthEntry, Page } from './types';
import {
  STORAGE_KEY,
  loadState,
  ensureMonthEntries,
  makeEntryKey,
  clamp,
  getPreviousMonthKey,
  getNextMonthKey,
} from './utils';
import { pullState, pushState, deleteCategoryApi, deleteLoanApi } from './api';
import { loadSession, clearSession } from './authApi';
import DashboardPage from './pages/DashboardPage';
import LoansPage from './pages/LoansPage';
import ManagePage from './pages/ManagePage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminPage from './pages/AdminPage';
import ErrorLogPage from './pages/ErrorLogPage';
import AboutPage from './pages/AboutPage';
import ChartsPage from './pages/ChartsPage';

function LoanTrackerLogo() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22b8c2"/>
          <stop offset="100%" stopColor="#0c5561"/>
        </linearGradient>
      </defs>
      <circle cx="19" cy="19" r="18.5" fill="url(#logo-g)"/>
      {/* bar chart */}
      <rect x="7" y="23" width="5" height="8" rx="2.5" fill="rgba(255,255,255,0.5)"/>
      <rect x="14" y="18" width="5" height="13" rx="2.5" fill="rgba(255,255,255,0.7)"/>
      <rect x="21" y="15" width="5" height="16" rx="2.5" fill="rgba(255,255,255,0.88)"/>
      <rect x="28" y="20" width="4" height="11" rx="2" fill="rgba(255,255,255,0.6)"/>
      {/* coin */}
      <circle cx="19" cy="10" r="5.5" fill="rgba(255,228,100,0.92)"/>
      <text x="19" y="10" textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="bold" fill="#0c4a50" fontFamily="'Trebuchet MS',Arial,sans-serif">₪</text>
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => loadSession());
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');

  // Sync refs — no re-renders needed
  const syncReady = useRef(false);   // initial pull has completed
  const apiOnline = useRef(false);   // pull succeeded at least once
  const justPulled = useRef(false);  // skip push right after a pull
  const latestStateRef = useRef(state); // always holds the latest state for pull conflict detection
  const pendingPush = useRef(false); // true when local changes have not yet been pushed

  // Pull full state from API whenever the authenticated user changes (login / session restore).
  // Skipped entirely when there is no session — no point hitting an auth-guarded endpoint.
  useEffect(() => {
    if (!authUser) {
      // No session: mark sync as ready (allow local pushes later) and go offline.
      syncReady.current = true;
      apiOnline.current = false;
      return;
    }
    // Reset flags so we don't push stale data while the pull is in flight.
    syncReady.current = false;
    apiOnline.current = false;

    // Snapshot state at pull-start so we can detect user edits made in-flight.
    const stateAtPullStart = latestStateRef.current;
    let cancelled = false;

    const attemptPull = async () => {
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          const apiState = await pullState(latestStateRef.current.selectedMonth);
          if (cancelled) return;
          apiOnline.current = true;
          if (latestStateRef.current !== stateAtPullStart) {
            // The user edited data while the pull was in-flight.
            // Keep their local changes; the push effect will sync them to the server.
          } else {
            justPulled.current = true;
            setState(ensureMonthEntries(apiState, apiState.selectedMonth));
          }
          return;
        } catch (err) {
          if (cancelled) return;
          console.error(err);
          if (attempt < MAX_RETRIES) {
            // Wait 3 s before the next attempt.
            await new Promise<void>(resolve => setTimeout(resolve, 3_000));
          }
        }
      }
    };

    attemptPull().finally(() => { if (!cancelled) syncReady.current = true; });
    return () => { cancelled = true; };
  // authUser.userId triggers a fresh pull on every login, not just on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.userId]);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activePage: Page =
    pathname.startsWith('/loans') ? 'loans' :
    pathname.startsWith('/manage') ? 'manage' :
    pathname.startsWith('/history') ? 'history' :
    pathname.startsWith('/charts') ? 'charts' :
    pathname.startsWith('/admin') ? 'admin' :
    pathname.startsWith('/errors') ? 'errors' :
    pathname.startsWith('/about') ? 'about' :
    pathname.startsWith('/user') ? 'user' : 'dashboard';

  const historyLoanId = pathname.startsWith('/history/')
    ? pathname.slice('/history/'.length)
    : null;

  function setActivePage(page: Page) {
    navigate(page === 'dashboard' ? '/' : `/${page}`);
  }

  useEffect(() => {
    // Always track the latest state for pull-vs-local conflict detection.
    latestStateRef.current = state;
    // Always keep localStorage in sync as a fallback
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Don't push before the initial pull finishes
    if (!syncReady.current) return;
    // Don't push back data we just pulled from the API
    if (justPulled.current) { justPulled.current = false; return; }
    // Don't push when offline
    if (!apiOnline.current) return;

    // Mark that there are unsynced changes immediately (not only when the
    // debounced push fires) so an exit within the debounce window can flush them.
    pendingPush.current = true;
    const timer = setTimeout(() => {
      pushState(state)
        .then(() => { pendingPush.current = false; })
        .catch(console.error);
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  // Flush unsynced changes when the page is hidden or closed (tab close, mobile
  // app backgrounding). Uses a keepalive request so it completes during unload —
  // this prevents losing an edit made right before exiting (e.g. a confirmation).
  useEffect(() => {
    function flush() {
      if (!authUser) return;
      if (!syncReady.current || !apiOnline.current) return;
      if (!pendingPush.current) return;
      pendingPush.current = false;
      pushState(latestStateRef.current, { keepalive: true }).catch(() => {});
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush();
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authUser]);

  function handleSelectMonth(monthKey: string) {
    setState((s) => ensureMonthEntries(s, monthKey));
  }

  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);

  function addCategory(category: Category) {
    setState((s) => ({ ...s, categories: [...s.categories, category] }));
  }

  function deleteCategory(categoryId: string) {
    setState((s) => {
      const loans = s.loans.filter((l) => l.categoryId !== categoryId);
      const deletedLoanIds = new Set(
        s.loans.filter((l) => l.categoryId === categoryId).map((l) => l.id),
      );
      const monthEntries = Object.fromEntries(
        Object.entries(s.monthEntries).filter(([, e]) => !deletedLoanIds.has(e.loanId)),
      );
      return {
        ...s,
        categories: s.categories.filter((c) => c.id !== categoryId),
        loans,
        monthEntries,
      };
    });
    // Cascade delete on the server (loans + their month_entries are deleted via FK cascade)
    if (apiOnline.current) {
      deleteCategoryApi(categoryId).catch(console.error);
    }
  }

  function updateCategory(updated: Category) {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === updated.id ? updated : c)),
    }));
  }

  function handleCategoryCreated(categoryId: string) {
    setInitialCategoryId(categoryId);
    navigate('/loans');
  }

  function addLoan(loan: Loan) {
    setState((s) => ensureMonthEntries({ ...s, loans: [...s.loans, loan] }, s.selectedMonth));
  }

  function deleteLoan(loanId: string) {
    setState((s) => {
      const monthEntries = { ...s.monthEntries };
      for (const key of Object.keys(monthEntries)) {
        if (monthEntries[key].loanId === loanId) delete monthEntries[key];
      }
      return { ...s, loans: s.loans.filter((l) => l.id !== loanId), monthEntries };
    });
    // Delete on the server (month_entries are deleted via FK cascade)
    if (apiOnline.current) {
      deleteLoanApi(loanId).catch(console.error);
    }
  }

  function updateLoan(updated: Loan) {
    setState((s) => {
      const next = { ...s, loans: s.loans.map((l) => (l.id === updated.id ? updated : l)) };
      return updated.isFrozen ? next : ensureMonthEntries(next, s.selectedMonth);
    });
  }

  function updateMonthEntry(loanId: string, updater: (entry: MonthEntry) => MonthEntry) {
    setState((s) => {
      const key = makeEntryKey(s.selectedMonth, loanId);
      const existing = s.monthEntries[key];
      if (!existing) return s;
      return { ...s, monthEntries: { ...s.monthEntries, [key]: updater(existing) } };
    });
  }

  function handleConfirmLoan(loanId: string) {
    updateMonthEntry(loanId, (entry) => ({ ...entry, confirmed: true, manuallyEdited: false }));
  }

  function handleAmountChange(loanId: string, value: string) {
    const amount = Number(value);
    updateMonthEntry(loanId, (entry) => ({
      ...entry,
      amount: Number.isFinite(amount) ? amount : 0,
      confirmed: true,
      manuallyEdited: true,
    }));
  }

  function handleInstallmentChange(loanId: string, totalPayments: number, value: string) {
    const raw = Number(value);
    updateMonthEntry(loanId, (entry) => ({
      ...entry,
      installmentNumber: clamp(
        Number.isFinite(raw) ? Math.round(raw) : entry.installmentNumber,
        1,
        totalPayments,
      ),
      confirmed: true,
      manuallyEdited: true,
    }));
  }

  function handleLogout() {
    // Clear the cached financial data so a different user logging in on the same
    // device cannot see a previous user's data even briefly before the pull completes.
    window.localStorage.removeItem(STORAGE_KEY);
    clearSession();
    setState(loadState()); // returns empty initial state now that STORAGE_KEY is gone
    setAuthUser(null);
  }

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (!authUser) {
    if (authView === 'register') {
      return <RegisterPage onLogin={setAuthUser} onGoLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPasswordPage onLogin={setAuthUser} onGoLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onLogin={setAuthUser}
        onGoRegister={() => setAuthView('register')}
        onGoForgot={() => setAuthView('forgot')}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Top navigation bar */}
      <nav className="app-nav card">
        <div className="nav-brand">
          <span className="nav-logo"><LoanTrackerLogo /></span>
          <div>
            <p className="nav-eyebrow">מעקב הלוואות</p>
            <strong className="nav-title">לוח הלוואות</strong>
          </div>
        </div>

        <div className="nav-month-row">
          <button
            type="button"
            className="nav-month-btn"
            onClick={() => handleSelectMonth(getPreviousMonthKey(state.selectedMonth))}
            aria-label="חודש קודם"
          >
            ‹
          </button>
          <input
            type="month"
            className="nav-month-input"
            value={state.selectedMonth}
            onChange={(event) => handleSelectMonth(event.target.value)}
          />
          <button
            type="button"
            className="nav-month-btn"
            onClick={() => handleSelectMonth(getNextMonthKey(state.selectedMonth))}
            aria-label="חודש הבא"
          >
            ›
          </button>
        </div>

        {/* Hamburger - mobile only */}
        <button
          type="button"
          className={menuOpen ? 'nav-hamburger open' : 'nav-hamburger'}
          aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <div className={menuOpen ? 'nav-tabs nav-tabs--open' : 'nav-tabs'} role="tablist">
          {(['dashboard', 'loans', 'history', 'charts', 'manage'] as Page[]).map((page) => (
            <button
              key={page}
              type="button"
              role="tab"
              aria-selected={activePage === page}
              className={activePage === page ? 'nav-tab active' : 'nav-tab'}
              onClick={() => { setActivePage(page); setMenuOpen(false); }}
            >
              {page === 'dashboard' ? 'סיכום' : page === 'loans' ? 'הלוואות' : page === 'history' ? 'היסטוריה' : page === 'charts' ? '📊 גרפים' : 'ניהול'}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={activePage === 'user'}
            className={activePage === 'user' ? 'nav-tab active nav-tab-user' : 'nav-tab nav-tab-user'}
            onClick={() => { setActivePage('user'); setMenuOpen(false); }}
            title={authUser.name}
          >
            <span className="user-tab-avatar">{authUser.name.charAt(0).toUpperCase()}</span>
            <span>{authUser.name.split(' ')[0]}</span>
          </button>
          {authUser.isAdmin && (
            <button
              type="button"
              role="tab"
              aria-selected={activePage === 'admin'}
              className={activePage === 'admin' ? 'nav-tab active nav-tab-admin' : 'nav-tab nav-tab-admin'}
              onClick={() => { setActivePage('admin'); setMenuOpen(false); }}
            >
              🛡 אדמין
            </button>
          )}
          {authUser.isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={activePage === 'errors'}
            className={activePage === 'errors' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => { setActivePage('errors'); setMenuOpen(false); }}
            title="לוג שגיאות"
          >
            ⚠️ שגיאות
          </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={activePage === 'about'}
            className={activePage === 'about' ? 'nav-tab active' : 'nav-tab'}
            onClick={() => { setActivePage('about'); setMenuOpen(false); }}
            title="אודות"
          >
            ℹ️ אודות
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="page-content">
        {activePage === 'user' && (
          <UserDashboardPage
            user={authUser}
            state={state}
            onLogout={handleLogout}
          />
        )}
        {activePage === 'admin' && authUser.isAdmin && (
          <AdminPage authUser={authUser} />
        )}
        {activePage === 'dashboard' && (
          <DashboardPage
            state={state}
            onNavigateManage={() => setActivePage('manage')}
          />
        )}

        {activePage === 'loans' && (
          <LoansPage
            state={state}
            onAddLoan={addLoan}
            onDeleteLoan={deleteLoan}
            onUpdateLoan={updateLoan}
            onConfirmLoan={handleConfirmLoan}
            onAmountChange={handleAmountChange}
            onInstallmentChange={handleInstallmentChange}
            onNavigateManage={() => setActivePage('manage')}
            initialCategoryId={initialCategoryId}
            onInitialCategoryConsumed={() => setInitialCategoryId(null)}
          />
        )}

        {activePage === 'manage' && (
          <ManagePage
            state={state}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            onUpdateCategory={updateCategory}
            onCategoryCreated={handleCategoryCreated}
            onSelectMonth={handleSelectMonth}
          />
        )}

        {activePage === 'charts' && (
          <ChartsPage
            state={state}
            onNavigateManage={() => setActivePage('manage')}
          />
        )}
        {activePage === 'errors' && authUser.isAdmin && <ErrorLogPage />}
        {activePage === 'about' && <AboutPage />}

        {activePage === 'history' && (
          <HistoryPage
            state={state}
            historyLoanId={historyLoanId}
            onSelectMonth={handleSelectMonth}
            onNavigateLoans={() => setActivePage('loans')}
          />
        )}
      </main>

    </div>
  );
}
