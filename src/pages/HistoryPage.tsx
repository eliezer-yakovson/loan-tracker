import { useNavigate } from 'react-router-dom';
import type { AppState } from '../types';
import { makeEntryKey, formatCurrency, formatMonthLabel, compareMonthKeys } from '../utils';

interface Props {
  state: AppState;
  historyLoanId: string | null;
  onSelectMonth: (monthKey: string) => void;
  onNavigateLoans: () => void;
}

export default function HistoryPage({
  state,
  historyLoanId,
  onSelectMonth,
  onNavigateLoans,
}: Props) {
  const navigate = useNavigate();

  const categoriesById = Object.fromEntries(state.categories.map((c) => [c.id, c]));

  const allMonths = Array.from(
    new Set(Object.values(state.monthEntries).map((e) => e.monthKey)),
  ).sort((a, b) => compareMonthKeys(b, a));

  if (state.loans.length === 0) {
    return (
      <section className="empty-board card">
        <h2>אין היסטוריה</h2>
        <p>
          עדיין לא נוספו הלוואות. הוסף הלוואה בדף{' '}
          <button type="button" className="link-btn" onClick={onNavigateLoans}>
            הלוואות
          </button>
          .
        </p>
      </section>
    );
  }

  /* ── Per-loan drill-down ── */
  if (historyLoanId) {
    const loan = state.loans.find((l) => l.id === historyLoanId);

    if (!loan) {
      return (
        <section className="empty-board card">
          <h2>הלוואה לא נמצאה</h2>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/history')}
          >
            חזרה להיסטוריה
          </button>
        </section>
      );
    }

    const loanCategory = categoriesById[loan.categoryId];
    const loanMonths = allMonths.filter((m) => state.monthEntries[makeEntryKey(m, loan.id)]);
    const totalPaid = loanMonths.reduce((sum, m) => {
      const e = state.monthEntries[makeEntryKey(m, loan.id)];
      return sum + (e ? e.amount : 0);
    }, 0);

    return (
      <section className="history-detail card">
        <div className="history-detail-header">
          <div>
            <p className="eyebrow">{loanCategory?.name}</p>
            <h2>{loan.name}</h2>
            <p className="history-meta">
              {loan.lenderName} · סכום מקורי:{' '}
              <strong>{formatCurrency(loan.originalAmount)}</strong> · {loan.totalPayments}{' '}
              תשלומים · יום ירידה: {loan.monthlyDueDay} בחודש
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={() => navigate('/history')}>
            ← חזרה
          </button>
        </div>

        <div className="history-summary-row">
          <div className="history-summary-chip">
            <span>שולם עד כה</span>
            <strong>{formatCurrency(totalPaid)}</strong>
          </div>
          <div className="history-summary-chip">
            <span>נרשמו</span>
            <strong>{loanMonths.length} חודשים</strong>
          </div>
          <div className="history-summary-chip">
            <span>נותר לתשלום</span>
            <strong>{formatCurrency(Math.max(loan.originalAmount - totalPaid, 0))}</strong>
          </div>
        </div>

        <div className="hist-table-wrapper">
          <table className="hist-table">
            <thead>
              <tr>
                <th>חודש</th>
                <th>תשלום מס'</th>
                <th>סכום</th>
                <th>סטטוס</th>
                <th>עודכן ידנית</th>
              </tr>
            </thead>
            <tbody>
              {loanMonths.map((m) => {
                const e = state.monthEntries[makeEntryKey(m, loan.id)]!;
                return (
                  <tr key={m} className={e.confirmed ? 'row-confirmed' : 'row-pending'}>
                    <td>{formatMonthLabel(m)}</td>
                    <td>
                      {e.installmentNumber} / {loan.totalPayments}
                    </td>
                    <td>
                      <strong>{formatCurrency(e.amount)}</strong>
                    </td>
                    <td>
                      <span className={e.confirmed ? 'status-pill ok' : 'status-pill wait'}>
                        {e.confirmed ? 'מאושר' : 'ממתין'}
                      </span>
                    </td>
                    <td>{e.manuallyEdited ? '✓' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="hist-total-row">
                <td colSpan={2}>סה"כ שולם</td>
                <td>
                  <strong>{formatCurrency(totalPaid)}</strong>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  }

  /* ── Consolidated history table ── */
  const sortedLoans = [...state.loans].sort((a, b) => {
    const catA = categoriesById[a.categoryId]?.name ?? '';
    const catB = categoriesById[b.categoryId]?.name ?? '';
    return catA.localeCompare(catB, 'he') || a.name.localeCompare(b.name, 'he');
  });

  return (
    <section className="history-overview card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">כל החודשים · כל ההלוואות</p>
          <h2>היסטוריה מרוכזת</h2>
        </div>
        <span className="history-hint">לחץ על שם הלוואה לצפייה בפירוט</span>
      </div>

      <div className="hist-table-wrapper">
        <table className="hist-table hist-consolidated">
          <thead>
            <tr>
              <th className="col-month">חודש</th>
              {sortedLoans.map((loan) => (
                <th key={loan.id} className="col-loan">
                  <button
                    type="button"
                    className="loan-col-btn"
                    onClick={() => navigate(`/history/${loan.id}`)}
                    title={`${categoriesById[loan.categoryId]?.name} · ${loan.lenderName}`}
                  >
                    <span className="loan-col-name">{loan.name}</span>
                    <span className="loan-col-cat">{categoriesById[loan.categoryId]?.name}</span>
                  </button>
                </th>
              ))}
              <th className="col-total">סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {allMonths.map((monthKey) => {
              const monthTotal = sortedLoans.reduce((sum, loan) => {
                const e = state.monthEntries[makeEntryKey(monthKey, loan.id)];
                return sum + (e ? e.amount : 0);
              }, 0);
              const isSelected = monthKey === state.selectedMonth;

              return (
                <tr key={monthKey} className={isSelected ? 'row-current-month' : ''}>
                  <td className="cell-month">
                    <button
                      type="button"
                      className="month-link-btn"
                      onClick={() => onSelectMonth(monthKey)}
                    >
                      {formatMonthLabel(monthKey)}
                    </button>
                  </td>
                  {sortedLoans.map((loan) => {
                    const e = state.monthEntries[makeEntryKey(monthKey, loan.id)];
                    return (
                      <td
                        key={loan.id}
                        className={
                          e
                            ? e.confirmed
                              ? 'cell-amount cell-ok'
                              : 'cell-amount cell-wait'
                            : 'cell-empty'
                        }
                      >
                        {e ? formatCurrency(e.amount) : '—'}
                      </td>
                    );
                  })}
                  <td className="cell-total">
                    <strong>{formatCurrency(monthTotal)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="hist-total-row">
              <td>סה"כ</td>
              {sortedLoans.map((loan) => {
                const loanTotal = Object.values(state.monthEntries)
                  .filter((e) => e.loanId === loan.id)
                  .reduce((sum, e) => sum + e.amount, 0);
                return (
                  <td key={loan.id}>
                    <strong>{formatCurrency(loanTotal)}</strong>
                  </td>
                );
              })}
              <td>
                <strong>
                  {formatCurrency(
                    Object.values(state.monthEntries).reduce((s, e) => s + e.amount, 0),
                  )}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
