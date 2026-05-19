import { clearSession } from '../authApi';
import type { AuthUser } from '../types';
import { formatCurrency } from '../utils';
import type { AppState } from '../types';

interface Props {
  user: AuthUser;
  state: AppState;
  onLogout: () => void;
}

export default function UserDashboardPage({ user, state, onLogout }: Props) {
  const totalLoans = state.loans.length;
  const totalOriginal = state.loans.reduce((sum, l) => sum + l.originalAmount, 0);
  const frozenCount = state.loans.filter((l) => l.isFrozen).length;
  const activeCount = state.loans.filter((l) => !l.isFrozen).length;
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  function handleLogout() {
    onLogout();
  }

  return (
    <section className="user-dashboard card">
      {/* Avatar + name */}
      <div className="user-hero">
        <div className="user-avatar">{initials || '?'}</div>
        <div>
          <h2 className="user-name">{user.name}</h2>
          <p className="user-email" dir="ltr">{user.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="user-stats">
        <article className="user-stat-card">
          <span>הלוואות פעילות</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="user-stat-card">
          <span>הלוואות מוקפאות</span>
          <strong>{frozenCount}</strong>
        </article>
        <article className="user-stat-card">
          <span>סה"כ הלוואות</span>
          <strong>{totalLoans}</strong>
        </article>
        <article className="user-stat-card">
          <span>סכום מקורי כולל</span>
          <strong>{formatCurrency(totalOriginal)}</strong>
        </article>
      </div>

      {/* Account info */}
      <div className="user-info-section">
        <h3>פרטי חשבון</h3>
        <dl className="user-info-dl">
          <div>
            <dt>שם</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>מייל</dt>
            <dd dir="ltr">{user.email}</dd>
          </div>
        </dl>
      </div>

      {/* Logout */}
      <div className="user-actions">
        <button type="button" className="danger-button" onClick={handleLogout}>
          התנתק
        </button>
      </div>
    </section>
  );
}
