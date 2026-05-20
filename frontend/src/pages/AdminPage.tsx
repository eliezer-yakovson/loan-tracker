import { useEffect, useState } from 'react';
import { fetchAdminUsers, toggleUserActive, type AdminUser } from '../authApi';
import type { AuthUser } from '../types';

interface Props {
  authUser: AuthUser;
}

export default function AdminPage({ authUser }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUsers(authUser.token)
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authUser.token]);

  async function handleToggle(userId: string) {
    setTogglingId(userId);
    try {
      const updated = await toggleUserActive(authUser.token, userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, is_active: updated.is_active } : u)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTogglingId(null);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('he-IL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">ניהול משתמשים</h1>
        <span className="admin-count">{users.length} משתמשים</span>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="admin-loading">טוען...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>מייל</th>
                <th>הצטרף</th>
                <th>סטטוס</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={!u.is_active ? 'admin-row--inactive' : ''}>
                  <td>
                    <span className="admin-name">{u.name}</span>
                    {u.is_admin && <span className="admin-badge">אדמין</span>}
                  </td>
                  <td dir="ltr" className="admin-email">{u.email}</td>
                  <td className="admin-date">{formatDate(u.created_at)}</td>
                  <td>
                    <span className={`admin-status ${u.is_active ? 'admin-status--active' : 'admin-status--inactive'}`}>
                      {u.is_active ? 'פעיל' : 'מושבת'}
                    </span>
                  </td>
                  <td>
                    {u.id !== authUser.userId && (
                      <button
                        type="button"
                        className={`admin-toggle-btn ${u.is_active ? 'admin-toggle-btn--disable' : 'admin-toggle-btn--enable'}`}
                        onClick={() => handleToggle(u.id)}
                        disabled={togglingId === u.id}
                      >
                        {togglingId === u.id ? '...' : u.is_active ? 'השבת' : 'הפעל'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
