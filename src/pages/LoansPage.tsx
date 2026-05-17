import { type FormEvent, useState } from 'react';
import type { AppState, Category, Loan, LoanFormState, MonthEntry } from '../types';
import {
  makeEntryKey,
  formatCurrency,
  formatDate,
  createLoanForm,
  makeId,
  clamp,
} from '../utils';

interface Props {
  state: AppState;
  onAddLoan: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
  onUpdateLoan: (loan: Loan) => void;
  onConfirmLoan: (loanId: string) => void;
  onAmountChange: (loanId: string, value: string) => void;
  onInstallmentChange: (loanId: string, totalPayments: number, value: string) => void;
  onNavigateManage: () => void;
}

export default function LoansPage({
  state,
  onAddLoan,
  onDeleteLoan,
  onUpdateLoan,
  onConfirmLoan,
  onAmountChange,
  onInstallmentChange,
  onNavigateManage,
}: Props) {
  const [loanFormCategoryId, setLoanFormCategoryId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState<LoanFormState>(() =>
    createLoanForm(state.selectedMonth),
  );
  const [expandedLoans, setExpandedLoans] = useState<Record<string, boolean>>({});

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

  const categoryColumns = state.categories.map((category) => {
    const items = currentMonthItems.filter((item) => item.category.id === category.id);
    const monthlyTotal = items.reduce((sum, item) => sum + item.entry.amount, 0);
    return { category, items, monthlyTotal };
  });

  const frozenLoans = state.loans.filter((l) => l.isFrozen);

  function openLoanForm(categoryId: string) {
    setLoanFormCategoryId(categoryId);
    setLoanForm(createLoanForm(state.selectedMonth));
  }

  function handleAddLoanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loanFormCategoryId) return;

    const trimmedName = loanForm.name.trim();
    const category = categoriesById[loanFormCategoryId];
    const originalAmount = Number(loanForm.originalAmount);
    const monthlyAmount = Number(loanForm.monthlyAmount);
    const totalPayments = Number(loanForm.totalPayments);
    const monthlyDueDay = clamp(Number(loanForm.monthlyDueDay || '1'), 1, 31);
    const partialPercentage = clamp(Number(loanForm.partialPercentage || '100'), 1, 100);

    if (
      !trimmedName ||
      !loanForm.takenDate ||
      !Number.isFinite(originalAmount) ||
      originalAmount <= 0 ||
      !Number.isFinite(monthlyAmount) ||
      monthlyAmount <= 0 ||
      !Number.isFinite(totalPayments) ||
      totalPayments <= 0 ||
      !category
    ) {
      window.alert('יש למלא את כל שדות החובה עם ערכים תקינים.');
      return;
    }

    const newLoan: Loan = {
      id: makeId('loan'),
      categoryId: loanFormCategoryId,
      name: trimmedName,
      lenderName: loanForm.lenderName.trim() || category.name,
      originalAmount,
      monthlyAmount,
      totalPayments: Math.round(totalPayments),
      takenDate: loanForm.takenDate,
      monthlyDueDay,
      notes: loanForm.notes.trim(),
      isFrozen: false,
      partialPercentage,
    };

    onAddLoan(newLoan);
    setLoanFormCategoryId(null);
    setLoanForm(createLoanForm(state.selectedMonth));
  }

  function toggleExpandedLoan(loanId: string) {
    setExpandedLoans((s) => ({ ...s, [loanId]: !s[loanId] }));
  }

  function handleDelete(loan: Loan) {
    if (window.confirm(`למחוק את ההלוואה "${loan.name}"? הפעולה תמחק גם את כל ההיסטוריה.`)) {
      onDeleteLoan(loan.id);
    }
  }

  function handleToggleFreeze(loan: Loan) {
    onUpdateLoan({ ...loan, isFrozen: !loan.isFrozen });
  }

  return (
    <>
      {state.categories.length === 0 ? (
        <section className="empty-board card">
          <h2>עדיין אין לוח הלוואות</h2>
          <p>
            עבור לדף{' '}
            <button type="button" className="link-btn" onClick={onNavigateManage}>
              ניהול
            </button>{' '}
            כדי להוסיף קטגוריה חדשה. כל קטגוריה תיפתח כעמודה, ובתוכה תוכל להוסיף הלוואות,
            לשמור היסטוריה חודשית, ולאשר כל שורה בצבע.
          </p>
        </section>
      ) : null}

      {/* Frozen loans panel */}
      {frozenLoans.length > 0 && (
        <section className="frozen-panel card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">מוקפאות</p>
              <h2>הלוואות בהקפאה ({frozenLoans.length})</h2>
            </div>
          </div>
          <div className="frozen-list">
            {frozenLoans.map((loan) => {
              const category = categoriesById[loan.categoryId];
              return (
                <article key={loan.id} className="loan-card frozen">
                  <div className="loan-card-header">
                    <div>
                      <h3>{loan.name}</h3>
                      <p>{loan.lenderName || category?.name}</p>
                    </div>
                    <span className="status-pill frozen-pill">❄ מוקפאת</span>
                  </div>
                  <div className="loan-card-actions">
                    <button type="button" className="secondary-button" onClick={() => handleToggleFreeze(loan)}>
                      ביטול הקפאה
                    </button>
                    <button type="button" className="danger-button" onClick={() => handleDelete(loan)}>
                      🗑 מחיקה
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="category-grid">
        {categoryColumns.map((col) => (
          <article key={col.category.id} className="category-column card">
            <header className="category-header">
              <div>
                <h2>{col.category.name}</h2>
                <p>
                  חיוב חודשי: <strong>{formatCurrency(col.monthlyTotal)}</strong>
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => openLoanForm(col.category.id)}
              >
                הוספת הלוואה
              </button>
            </header>

            {loanFormCategoryId === col.category.id ? (
              <form className="loan-form" onSubmit={handleAddLoanSubmit}>
                <div className="loan-form-grid">
                  <label className="field-block">
                    <span>שם ההלוואה</span>
                    <input
                      type="text"
                      value={loanForm.name}
                      onChange={(e) => setLoanForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="למשל: הלוואת רכב"
                    />
                  </label>

                  <label className="field-block">
                    <span>שם המלווה</span>
                    <input
                      type="text"
                      value={loanForm.lenderName}
                      onChange={(e) => setLoanForm((f) => ({ ...f, lenderName: e.target.value }))}
                      placeholder="אם ריק, יילקח שם הקטגוריה"
                    />
                  </label>

                  <label className="field-block">
                    <span>סכום הלוואה מקורי</span>
                    <input
                      type="number"
                      step="0.01"
                      value={loanForm.originalAmount}
                      onChange={(e) =>
                        setLoanForm((f) => ({ ...f, originalAmount: e.target.value }))
                      }
                    />
                  </label>

                  <label className="field-block">
                    <span>חיוב חודשי</span>
                    <input
                      type="number"
                      step="0.01"
                      value={loanForm.monthlyAmount}
                      onChange={(e) =>
                        setLoanForm((f) => ({ ...f, monthlyAmount: e.target.value }))
                      }
                    />
                  </label>

                  <label className="field-block">
                    <span>מספר תשלומים</span>
                    <input
                      type="number"
                      value={loanForm.totalPayments}
                      onChange={(e) =>
                        setLoanForm((f) => ({ ...f, totalPayments: e.target.value }))
                      }
                    />
                  </label>

                  <label className="field-block">
                    <span>אחוז חלקי (1–100%)</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={loanForm.partialPercentage}
                      onChange={(e) =>
                        setLoanForm((f) => ({ ...f, partialPercentage: e.target.value }))
                      }
                    />
                  </label>

                  <label className="field-block">
                    <span>תאריך לקיחה</span>
                    <input
                      type="date"
                      value={loanForm.takenDate}
                      onChange={(e) => setLoanForm((f) => ({ ...f, takenDate: e.target.value }))}
                    />
                  </label>

                  <label className="field-block">
                    <span>יום ירידה חודשי</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={loanForm.monthlyDueDay}
                      onChange={(e) =>
                        setLoanForm((f) => ({ ...f, monthlyDueDay: e.target.value }))
                      }
                    />
                  </label>

                  <label className="field-block full-width">
                    <span>הערות</span>
                    <textarea
                      rows={3}
                      value={loanForm.notes}
                      onChange={(e) => setLoanForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="פרטים נוספים אם צריך"
                    />
                  </label>
                </div>

                <div className="loan-form-actions">
                  <button type="submit" className="primary-button">
                    שמירת הלוואה
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setLoanFormCategoryId(null)}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            ) : null}

            <div className="loan-list">
              {col.items.length === 0 ? (
                <div className="empty-column">
                  אין הלוואות פעילות בחודש הזה. אפשר להוסיף הלוואה חדשה לעמודה.
                </div>
              ) : (
                col.items.map(({ loan, entry }) => {
                  const remainingPayments = Math.max(
                    loan.totalPayments - entry.installmentNumber,
                    0,
                  );
                  const showPartial = loan.partialPercentage < 100;

                  return (
                    <article
                      key={loan.id}
                      className={entry.confirmed ? 'loan-card confirmed' : 'loan-card pending'}
                    >
                      <div className="loan-card-header">
                        <div>
                          <h3>{loan.name}</h3>
                          <p>{loan.lenderName || col.category.name}</p>
                        </div>
                        <div className="status-group">
                          <span
                            className={entry.confirmed ? 'status-pill ok' : 'status-pill wait'}
                          >
                            {entry.confirmed ? 'ירוק / מאושר' : 'אדום / ממתין'}
                          </span>
                          {showPartial && (
                            <span className="status-pill partial-pill">{loan.partialPercentage}%</span>
                          )}
                          {entry.manuallyEdited ? (
                            <span className="status-subtle">עודכן ידנית</span>
                          ) : null}
                        </div>
                      </div>

                      <p className="installment-line">
                        תשלום {entry.installmentNumber} מתוך {loan.totalPayments} | נותרו{' '}
                        {remainingPayments} תשלומים
                      </p>

                      <div className="loan-edit-grid">
                        <label className="field-block compact">
                          <span>חיוב חודשי</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.amount}
                            onChange={(e) => onAmountChange(loan.id, e.target.value)}
                          />
                        </label>

                        <label className="field-block compact">
                          <span>מספר תשלום נוכחי</span>
                          <input
                            type="number"
                            min="1"
                            max={loan.totalPayments}
                            value={entry.installmentNumber}
                            onChange={(e) =>
                              onInstallmentChange(loan.id, loan.totalPayments, e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="loan-card-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => onConfirmLoan(loan.id)}
                        >
                          מאשר
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => toggleExpandedLoan(loan.id)}
                        >
                          {expandedLoans[loan.id] ? 'סגירת פרטים' : 'פרטים נוספים'}
                        </button>
                        <button
                          type="button"
                          className="freeze-button"
                          onClick={() => handleToggleFreeze(loan)}
                          title="הקפאת הלוואה"
                        >
                          ❄
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDelete(loan)}
                          title="מחיקת הלוואה"
                        >
                          🗑
                        </button>
                      </div>

                      {expandedLoans[loan.id] ? (
                        <dl className="loan-details">
                          <div>
                            <dt>סכום הלוואה מקורי</dt>
                            <dd>{formatCurrency(loan.originalAmount)}</dd>
                          </div>
                          <div>
                            <dt>תאריך לקיחה</dt>
                            <dd>{formatDate(loan.takenDate)}</dd>
                          </div>
                          <div>
                            <dt>יום ירידה חודשי</dt>
                            <dd>כל {loan.monthlyDueDay} בחודש</dd>
                          </div>
                          <div>
                            <dt>תשלום נוכחי</dt>
                            <dd>
                              {entry.installmentNumber} מתוך {loan.totalPayments}
                            </dd>
                          </div>
                          <div>
                            <dt>נותרו תשלומים</dt>
                            <dd>{remainingPayments}</dd>
                          </div>
                          <div>
                            <dt>שם המלווה</dt>
                            <dd>{loan.lenderName || col.category.name}</dd>
                          </div>
                          <div>
                            <dt>אחוז חלקי</dt>
                            <dd>{loan.partialPercentage}%</dd>
                          </div>
                          {loan.notes ? (
                            <div className="full-width">
                              <dt>הערות</dt>
                              <dd>{loan.notes}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
