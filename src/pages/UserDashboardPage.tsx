import { type FormEvent, useState } from 'react';
import { clearSession, setPassword as setPasswordApi } from '../authApi';
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

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPassword.length < 8) {
      setPwError('סיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('הסיסמאות אינן תואמות');
      return;
    }
    setPwLoading(true);
    try {
      await setPasswordApi(user.token, newPassword);
      setPwSuccess('הסיסמה נשמרה. אפשר להתחבר עכשיו עם מייל וסיסמה.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwLoading(false);
    }
  }

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

      {/* Password */}
      <div className="user-info-section">
        <h3>סיסמה לכניסה מהירה</h3>
        <p style={{ margin: '0 0 0.75rem', color: '#62757b', fontSize: '0.9rem', lineHeight: 1.6 }}>
          הגדר סיסמה כדי להתחבר עם מייל וסיסמה, בנוסף לכניסה עם קוד למייל.
        </p>
        {pwError && <div className="auth-error">{pwError}</div>}
        {pwSuccess && (
          <div className="auth-error" style={{ background: '#e6f7ee', color: '#0c6b3f', borderColor: '#8fd8b3' }}>
            {pwSuccess}
          </div>
        )}
        <form onSubmit={handleSetPassword} className="auth-form" style={{ maxWidth: 360 }}>
          <label className="field-block">
            <span>סיסמה חדשה</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="לפחות 8 תווים"
              minLength={8}
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </label>
          <label className="field-block">
            <span>אימות סיסמה</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הקלד שוב"
              minLength={8}
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="primary-button" disabled={pwLoading}>
            {pwLoading ? 'שומר...' : 'שמור סיסמה'}
          </button>
        </form>
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
