import type { AppState, Category, Loan, MonthEntry } from '../types';
import { makeEntryKey, formatCurrency, formatMonthLabel } from '../utils';

interface Props {
  state: AppState;
  onNavigateManage: () => void;
}

export default function DashboardPage({ state, onNavigateManage }: Props) {
  const categoriesById = Object.fromEntries(state.categories.map((c) => [c.id, c]));

  const currentMonthItems = state.loans
    .map((loan) => {
      const entry = state.monthEntries[makeEntryKey(state.selectedMonth, loan.id)];
      const category = categoriesById[loan.categoryId];
      return { loan, entry, category };
    })
    .filter(
      (item): item is { loan: Loan; entry: MonthEntry; category: Category } =>
        Boolean(item.entry && item.category),
    )
    .sort((a, b) =>
      a.loan.monthlyDueDay !== b.loan.monthlyDueDay
        ? a.loan.monthlyDueDay - b.loan.monthlyDueDay
        : a.loan.name.localeCompare(b.loan.name, 'he'),
    );

  const confirmedItems = currentMonthItems.filter((item) => item.entry.confirmed);
  const pendingItems = currentMonthItems.filter((item) => !item.entry.confirmed);

  const categoryColumns = state.categories.map((category) => {
    const items = confirmedItems.filter((item) => item.category.id === category.id);
    const originalTotal = state.loans
      .filter((l) => l.categoryId === category.id)
      .reduce((sum, l) => sum + l.originalAmount, 0);
    const monthlyTotal = items.reduce((sum, item) => sum + item.entry.amount, 0);
    return { category, items, originalTotal, monthlyTotal, activeCount: items.length };
  });

  const dueSchedule = confirmedItems.reduce<
    Array<{
      day: number;
      total: number;
      items: Array<{ loanName: string; lenderName: string; amount: number; categoryName: string }>;
    }>
  >((schedule, item) => {
    const existing = schedule.find((e) => e.day === item.loan.monthlyDueDay);
    if (existing) {
      existing.total += item.entry.amount;
      existing.items.push({
        loanName: item.loan.name,
        lenderName: item.loan.lenderName || item.category.name,
        amount: item.entry.amount,
        categoryName: item.category.name,
      });
      return schedule;
    }
    schedule.push({
      day: item.loan.monthlyDueDay,
      total: item.entry.amount,
      items: [
        {
          loanName: item.loan.name,
          lenderName: item.loan.lenderName || item.category.name,
          amount: item.entry.amount,
          categoryName: item.category.name,
        },
      ],
    });
    return schedule;
  }, []);
  dueSchedule.sort((a, b) => a.day - b.day);

  const totalMonthlyAmount = confirmedItems.reduce((sum, item) => sum + item.entry.amount, 0);
  const totalOriginalAmount = state.loans.reduce((sum, l) => sum + l.originalAmount, 0);
  const confirmedCount = confirmedItems.length;
  const nextDueInMonth = dueSchedule[0];

  return (
    <>
      <section className="summary-grid">
        <article className="summary-card card">
          <span>סה"כ חיובים בחודש</span>
          <strong>{formatCurrency(totalMonthlyAmount)}</strong>
          <small>{formatMonthLabel(state.selectedMonth)}</small>
        </article>

        <article className="summary-card card">
          <span>סה"כ סכום מקורי</span>
          <strong>{formatCurrency(totalOriginalAmount)}</strong>
          <small>לכל ההלוואות בכל הקטגוריות</small>
        </article>

        <article className="summary-card card">
          <span>אישורים בחודש</span>
          <strong>
            {confirmedCount} / {currentMonthItems.length || 0}
          </strong>
          <small>
            {currentMonthItems.length > 0 && confirmedCount === currentMonthItems.length
              ? 'כל הכרטיסים מאושרים'
              : 'כרטיס אדום ממתין לאישור או לעדכון'}
          </small>
        </article>

        <article className="summary-card card">
          <span>החיוב הקרוב ביותר</span>
          <strong>{nextDueInMonth ? `יום ${nextDueInMonth.day}` : 'אין חיובים'}</strong>
          <small>
            {nextDueInMonth
              ? formatCurrency(nextDueInMonth.total)
              : 'בחר חודש עם הלוואות פעילות'}
          </small>
        </article>
      </section>

      <section className="bank-summary card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">סיכום לפי בנק או קטגוריה</p>
            <h2>סכומי הלוואות לפי עמודה</h2>
          </div>
        </div>

        <div className="bank-summary-grid">
          {categoryColumns.length === 0 ? (
            <div className="empty-state">
              אין עדיין קטגוריות.{' '}
              <button type="button" className="link-btn" onClick={onNavigateManage}>
                עבור לניהול
              </button>{' '}
              כדי להוסיף קטגוריה חדשה.
            </div>
          ) : (
            categoryColumns.map((col) => (
              <article key={col.category.id} className="bank-summary-item">
                <strong>{col.category.name}</strong>
                <span>חיוב חודשי: {formatCurrency(col.monthlyTotal)}</span>
                <span>סכום מקורי: {formatCurrency(col.originalTotal)}</span>
                <span>הלוואות פעילות החודש: {col.activeCount}</span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="schedule card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">מתי כל סכום יורד</p>
            <h2>סיכום חיובים לפי ימים בחודש</h2>
          </div>
        </div>

        {dueSchedule.length === 0 ? (
          <div className="empty-state">עדיין אין חיובים להצגה בחודש שנבחר.</div>
        ) : (
          <div className="schedule-table-wrapper">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>יום בחודש</th>
                  <th>סכום כולל</th>
                  <th>מה יורד באותו יום</th>
                </tr>
              </thead>
              <tbody>
                {dueSchedule.map((scheduleItem) => (
                  <tr key={scheduleItem.day}>
                    <td>יום {scheduleItem.day}</td>
                    <td>{formatCurrency(scheduleItem.total)}</td>
                    <td>
                      {scheduleItem.items
                        .map(
                          (item) =>
                            `${item.categoryName} / ${item.lenderName} / ${item.loanName} (${formatCurrency(item.amount)})`,
                        )
                        .join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending items - awaiting confirmation */}
      {pendingItems.length > 0 && (
        <section className="pending-summary card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">עדיין לאישור</p>
              <h2>נותר לאישור — {pendingItems.length} פריטים</h2>
            </div>
            <span className="pending-total-badge">סה&quot;כ: {formatCurrency(pendingItems.reduce((s, i) => s + i.entry.amount, 0))}</span>
          </div>
          <div className="schedule-table-wrapper">
            <table className="schedule-table pending-table">
              <thead>
                <tr>
                  <th>קטגוריה</th>
                  <th>שם הלוואה</th>
                  <th>מלווה</th>
                  <th>סכום חודשי</th>
                  <th>תשלום</th>
                  <th>יום ירידה</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map(({ loan, entry, category }) => (
                  <tr key={loan.id} className="pending-row">
                    <td>{category.name}</td>
                    <td>{loan.name}</td>
                    <td>{loan.lenderName || category.name}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>{entry.installmentNumber} / {loan.totalPayments}</td>
                    <td>יום {loan.monthlyDueDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
