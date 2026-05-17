import { useEffect, useState } from 'react';
import { fetchErrorLogs, clearErrorLogs, type ErrorLogEntry } from '../errorLogApi';

export default function ErrorLogPage() {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchErrorLogs();
      setLogs(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleClear() {
    if (!window.confirm('למחוק את כל הלוגים?')) return;
    setClearing(true);
    try {
      await clearErrorLogs();
      setLogs([]);
    } catch (e) {
      setError(String(e));
    } finally {
      setClearing(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('he-IL', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="manage-section card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">מערכת</p>
          <h2>לוג שגיאות</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" className="secondary-button" onClick={load} disabled={loading}>
            {loading ? 'טוען...' : 'רענן'}
          </button>
          {logs.length > 0 && (
            <button
              type="button"
              className="danger-button"
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing ? 'מוחק...' : 'נקה הכל'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
          אין שגיאות רשומות 🎉
        </p>
      )}

      {logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="error-log-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>הקשר</th>
                <th>הודעה</th>
                <th>פרטים</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="error-log-date">{formatDate(log.created_at)}</td>
                  <td><span className="error-log-context">{log.context || '—'}</span></td>
                  <td className="error-log-message">{log.message}</td>
                  <td className="error-log-details">
                    {log.details ? (
                      <details>
                        <summary>הצג</summary>
                        <pre>{log.details}</pre>
                      </details>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
