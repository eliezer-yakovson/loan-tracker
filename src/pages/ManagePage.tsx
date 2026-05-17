import { type FormEvent, useState } from 'react';
import type { AppState, Category, Loan, MonthEntry } from '../types';
import { makeEntryKey, formatCurrency, formatMonthLabel, makeId, compareMonthKeys } from '../utils';

interface Props {
  state: AppState;
  onAddCategory: (category: Category) => void;
  onSelectMonth: (monthKey: string) => void;
}

export default function ManagePage({ state, onAddCategory, onSelectMonth }: Props) {
  const [categoryName, setCategoryName] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const knownMonths = Array.from(
    new Set([
      state.selectedMonth,
      ...Object.values(state.monthEntries).map((e) => e.monthKey),
    ]),
  ).sort((a, b) => compareMonthKeys(b, a));

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const nameAlreadyExists = state.categories.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (nameAlreadyExists) {
      window.alert('הקטגוריה כבר קיימת. בחר שם אחר.');
      return;
    }

    const newCategory: Category = { id: makeId('category'), name: trimmedName };
    onAddCategory(newCategory);
    setCategoryName('');
  }

  async function handleCopyForExcel() {
    const categoriesById = Object.fromEntries(state.categories.map((c) => [c.id, c]));
    const items: Array<{ loan: Loan; entry: MonthEntry; category: Category }> = [];

    for (const loan of state.loans) {
      const entry = state.monthEntries[makeEntryKey(state.selectedMonth, loan.id)];
      const category = categoriesById[loan.categoryId];
      if (entry && category) items.push({ loan, entry, category });
    }

    if (items.length === 0) {
      setCopyStatus('אין כרגע נתונים להעתקה.');
      window.setTimeout(() => setCopyStatus(''), 3500);
      return;
    }

    const rows = [
      'חודש\tקטגוריה\tמלווה\tשם הלוואה\tסכום חודשי\tתשלום נוכחי\tסה"כ תשלומים\tיום חיוב',
      ...items.map((item) =>
        [
          formatMonthLabel(state.selectedMonth),
          item.category.name,
          item.loan.lenderName || item.category.name,
          item.loan.name,
          item.entry.amount,
          item.entry.installmentNumber,
          item.loan.totalPayments,
          item.loan.monthlyDueDay,
        ].join('\t'),
      ),
    ];

    const content = rows.join('\n');
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('הטבלה הועתקה. אפשר להדביק באקסל.');
    } catch {
      window.prompt('העתקה ידנית לאקסל', content);
      setCopyStatus('נפתחה תיבת העתקה ידנית.');
    }
    window.setTimeout(() => setCopyStatus(''), 3500);
  }

  return (
    <>
      <section className="manage-section card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">הגדרות ובקרה</p>
            <h2>ניהול קטגוריות וייצוא</h2>
          </div>
        </div>

        <div className="manage-grid">
          <div className="manage-block">
            <h3>הוספת קטגוריה חדשה</h3>
            <form className="category-form" onSubmit={handleAddCategory}>
              <label className="field-block">
                <span>שם קטגוריה</span>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="למשל: בנק הפועלים או משפחה"
                />
              </label>
              <button type="submit" className="primary-button">
                הוספת עמודה
              </button>
            </form>
          </div>

          <div className="manage-block">
            <h3>ייצוא נתונים לאקסל</h3>
            <div className="save-hint">
              <span>שמירה אוטומטית</span>
              <strong>הנתונים נשמרים מיידית בדפדפן</strong>
              <small>{copyStatus || 'אפשר להדביק את הנתונים ישירות לאקסל.'}</small>
            </div>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: '14px' }}
              onClick={handleCopyForExcel}
            >
              העתקה לאקסל
            </button>
          </div>
        </div>
      </section>

      {knownMonths.length > 0 ? (
        <section className="history-section card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">היסטוריה שמורה</p>
              <h2>מעבר בין חודשים</h2>
            </div>
          </div>
          <div className="history-list" aria-label="חודשי היסטוריה שמורים">
            {knownMonths.map((monthKey) => (
              <button
                key={monthKey}
                type="button"
                className={
                  monthKey === state.selectedMonth ? 'history-chip active' : 'history-chip'
                }
                onClick={() => onSelectMonth(monthKey)}
              >
                {formatMonthLabel(monthKey)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
