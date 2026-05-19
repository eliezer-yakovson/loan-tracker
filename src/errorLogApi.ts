const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface ErrorLogEntry {
  id: string;
  user_id: string;
  created_at: string;
  context: string;
  message: string;
  details: string;
}

function authHeader(): Record<string, string> {
  const token = sessionStorage.getItem('auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function logError(
  context: string,
  message: string,
  details: unknown = '',
): Promise<void> {
  const token = sessionStorage.getItem('auth_token');
  if (!token) return; // not logged in, can't log
  try {
    await fetch(`${API_BASE}/errors/`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({
        context,
        message: String(message).slice(0, 2000),
        details: typeof details === 'string' ? details : JSON.stringify(details).slice(0, 4000),
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently fail — we don't want error-logging to cause more errors
  }
}

export async function fetchErrorLogs(): Promise<ErrorLogEntry[]> {
  const res = await fetch(`${API_BASE}/errors/`, { headers: authHeader() });
  if (!res.ok) throw new Error(`Failed to fetch error logs: ${res.status}`);
  return res.json();
}

export async function clearErrorLogs(): Promise<void> {
  const res = await fetch(`${API_BASE}/errors/`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Failed to clear error logs: ${res.status}`);
}
