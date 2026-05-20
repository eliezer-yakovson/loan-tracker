import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AppState } from '../types';
import { makeEntryKey, formatCurrency, formatMonthLabel, compareMonthKeys } from '../utils';

interface Props {
  state: AppState;
  onNavigateManage: () => void;
}

const CATEGORY_COLORS = [
  '#1f9ea7', '#db7a44', '#7c6ff7', '#2ec4b6', '#e76f51',
  '#8ecae6', '#219ebc', '#f4a261', '#52b788', '#e63946',
];

interface TooltipPayloadEntry {
  name: string;
  value: number;
  fill: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.fill }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <span className="chart-tooltip-value">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      <div className="chart-tooltip-total">
        <span>סה"כ</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div className="chart-legend">
      {payload.map((entry) => (
        <span key={entry.value} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

export default function ChartsPage({ state, onNavigateManage }: Props) {
  const [monthCount, setMonthCount] = useState(12);

  // Collect all months that have at least one confirmed entry
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const entry of Object.values(state.monthEntries)) {
      if (entry.confirmed) monthSet.add(entry.monthKey);
    }
    return Array.from(monthSet).sort(compareMonthKeys);
  }, [state.monthEntries]);

  const visibleMonths = allMonths.slice(-monthCount);

  // Build chart data: [{month, catName1: amount, catName2: amount, ...}]
  const chartData = useMemo(() => {
    return visibleMonths.map((monthKey) => {
      const row: Record<string, string | number> = {
        month: formatMonthLabel(monthKey),
      };
      for (const category of state.categories) {
        const total = state.loans
          .filter((l) => l.categoryId === category.id)
          .reduce((sum, loan) => {
            const entry = state.monthEntries[makeEntryKey(monthKey, loan.id)];
            return sum + (entry?.confirmed ? entry.amount : 0);
          }, 0);
        row[category.name] = total;
      }
      return row;
    });
  }, [visibleMonths, state.categories, state.loans, state.monthEntries]);

  // Total per category across visible months (for summary cards)
  const categoryTotals = useMemo(() => {
    return state.categories.map((cat, i) => {
      const total = chartData.reduce((sum, row) => sum + ((row[cat.name] as number) || 0), 0);
      return { category: cat, total, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] };
    });
  }, [chartData, state.categories]);

  if (state.loans.length === 0 || state.categories.length === 0) {
    return (
      <section className="empty-board card">
        <h2>אין נתונים להצגה</h2>
        <p>
          הוסף קטגוריות והלוואות בדף{' '}
          <button type="button" className="link-btn" onClick={onNavigateManage}>
            ניהול
          </button>{' '}
          כדי לראות גרפים.
        </p>
      </section>
    );
  }

  if (allMonths.length === 0) {
    return (
      <section className="empty-board card">
        <h2>אין נתונים מאושרים עדיין</h2>
        <p>אשר תשלומים בדף הסיכום כדי שיופיעו בגרפים.</p>
      </section>
    );
  }

  return (
    <div className="charts-page">
      {/* Header */}
      <div className="charts-header card">
        <div>
          <p className="eyebrow">ניתוח נתונים</p>
          <h2 style={{ margin: 0, fontFamily: "Georgia, 'Times New Roman', serif", color: '#173136' }}>
            גרפים לפי קטגוריה
          </h2>
        </div>
        <div className="charts-filter">
          <label htmlFor="charts-month-count">הצג:</label>
          <select
            id="charts-month-count"
            value={monthCount}
            onChange={(e) => setMonthCount(Number(e.target.value))}
          >
            <option value={3}>3 חודשים אחרונים</option>
            <option value={6}>6 חודשים אחרונים</option>
            <option value={12}>12 חודשים אחרונים</option>
            <option value={9999}>כל התקופה</option>
          </select>
        </div>
      </div>

      {/* Category total pills */}
      <div className="charts-summary-row">
        {categoryTotals.map(({ category, total, color }) => (
          <div key={category.id} className="charts-summary-pill" style={{ borderColor: color }}>
            <span className="charts-summary-dot" style={{ background: color }} />
            <span className="charts-summary-name">{category.name}</span>
            <strong className="charts-summary-total">{formatCurrency(total)}</strong>
          </div>
        ))}
      </div>

      {/* Grouped bar chart */}
      <div className="chart-card card">
        <h3 className="chart-card-title">תשלומים חודשיים לפי קטגוריה</h3>
        <p className="chart-card-subtitle">
          כל קבוצה = חודש אחד · כל עמודה = קטגוריה
          {visibleMonths.length < allMonths.length &&
            ` · מציג ${visibleMonths.length} מתוך ${allMonths.length} חודשים`}
        </p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
              barCategoryGap="22%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,67,73,0.1)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#4a6070' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(36,67,73,0.15)' }}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000 ? `₪${(v / 1000).toFixed(0)}K` : `₪${v}`
                }
                tick={{ fontSize: 11, fill: '#4a6070' }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31,158,167,0.06)' }} />
              <Legend content={<CustomLegend />} />
              {state.categories.map((cat, i) => (
                <Bar
                  key={cat.id}
                  dataKey={cat.name}
                  fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={52}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
