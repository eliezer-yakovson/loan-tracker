// Auth API client — in dev uses Vite proxy (/api), in prod uses VITE_API_URL

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
  is_admin: boolean;
}

async function authFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail ?? `שגיאה ${res.status}`);
  }
  return data as T;
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerSendOtp(email: string, name: string): Promise<{ dev_code?: string }> {
  return authFetch<{ dev_code?: string }>('/auth/register/send-otp', { email, name });
}

export async function registerVerify(
  email: string,
  code: string,
  name: string,
): Promise<TokenResponse> {
  return authFetch('/auth/register/verify', { email, code, name });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginSendOtp(email: string): Promise<{ dev_code?: string }> {
  return authFetch<{ dev_code?: string }>('/auth/login/send-otp', { email, purpose: 'login' });
}

export async function loginVerify(email: string, code: string): Promise<TokenResponse> {
  return authFetch('/auth/login/verify', { email, code, purpose: 'login' });
}

// ── Reset / Forgot ────────────────────────────────────────────────────────────

export async function resetSendOtp(email: string): Promise<{ dev_code?: string }> {
  return authFetch<{ dev_code?: string }>('/auth/reset/send-otp', { email, purpose: 'reset' });
}

export async function resetVerify(email: string, code: string): Promise<TokenResponse> {
  return authFetch('/auth/reset/verify', { email, code, purpose: 'reset' });
}

// ── Current user ──────────────────────────────────────────────────────────────

export async function fetchMe(token: string): Promise<{ id: string; email: string; name: string; created_at: string }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

// ── Local session storage ─────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function saveSession(token: string, user: { userId: string; email: string; name: string; isAdmin?: boolean }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadSession(): { token: string; userId: string; email: string; name: string; isAdmin?: boolean } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw);
    return { token, ...user };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Admin API ─────────────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  is_active: boolean;
  is_admin: boolean;
}

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('אין הרשאה');
  return res.json();
}

export async function toggleUserActive(token: string, userId: string): Promise<{ id: string; is_active: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-active`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('שגיאה בשינוי סטטוס');
  return res.json();
}
