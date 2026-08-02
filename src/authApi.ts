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

// The API is hosted on a Hugging Face Space that sleeps when idle. The first
// request after idle can return 502/503/504 for a few seconds while it wakes up.
// We transparently retry those so the user isn't blocked by a transient error.
const WAKEUP_STATUSES = new Set([502, 503, 504]);
const MAX_WAKEUP_RETRIES = 4;
const WAKEUP_RETRY_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function authFetch<T>(path: string, body: unknown): Promise<T> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= MAX_WAKEUP_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Network error (server unreachable / still booting) — retry a few times.
      lastStatus = 0;
      if (attempt < MAX_WAKEUP_RETRIES) {
        await sleep(WAKEUP_RETRY_DELAY_MS);
        continue;
      }
      throw new Error('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט ונסה שוב.');
    }

    if (WAKEUP_STATUSES.has(res.status)) {
      // Server is waking up — wait and retry.
      lastStatus = res.status;
      if (attempt < MAX_WAKEUP_RETRIES) {
        await sleep(WAKEUP_RETRY_DELAY_MS);
        continue;
      }
      throw new Error('השרת מתעורר כרגע (שגיאה ' + res.status + '). המתן מספר שניות ונסה שוב.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { detail?: string }).detail ?? `שגיאה ${res.status}`);
    }
    return data as T;
  }
  // Unreachable in practice, but keeps TypeScript happy.
  throw new Error('השרת אינו זמין כרגע (שגיאה ' + lastStatus + '). נסה שוב מאוחר יותר.');
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function registerSendOtp(email: string, name: string): Promise<{ dev_code?: string }> {
  return authFetch<{ dev_code?: string }>('/auth/register/send-otp', { email, name });
}

export async function registerVerify(
  email: string,
  code: string,
  name: string,
  password?: string,
): Promise<TokenResponse> {
  const body: Record<string, unknown> = { email, code, name };
  if (password) body.password = password;
  return authFetch('/auth/register/verify', body);
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginSendOtp(email: string): Promise<{ dev_code?: string }> {
  return authFetch<{ dev_code?: string }>('/auth/login/send-otp', { email, purpose: 'login' });
}

export async function loginVerify(email: string, code: string): Promise<TokenResponse> {
  return authFetch('/auth/login/verify', { email, code, purpose: 'login' });
}

// Login with email + password (no OTP).
export async function loginPassword(email: string, password: string): Promise<TokenResponse> {
  return authFetch('/auth/login/password', { email, password });
}

// Set or change the password for the currently logged-in user.
export async function setPassword(token: string, password: string): Promise<{ detail: string }> {
  const res = await fetch(`${API_BASE}/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail ?? `שגיאה ${res.status}`);
  }
  return data as { detail: string };
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

// Use sessionStorage for the auth token so it is cleared automatically when the
// browser tab / window closes — reduces exposure on shared computers.
// Non-sensitive display fields (name, email) stay in localStorage for convenience.
export function saveSession(token: string, user: { userId: string; email: string; name: string; isAdmin?: boolean }) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadSession(): { token: string; userId: string; email: string; name: string; isAdmin?: boolean } | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
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
  sessionStorage.removeItem(TOKEN_KEY);
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
