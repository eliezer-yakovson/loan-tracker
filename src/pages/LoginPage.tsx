import { type FormEvent, useEffect, useState } from 'react';
import { loginSendOtp, loginVerify, loginPassword, saveSession } from '../authApi';
import type { AuthUser } from '../types';

const OTP_VALID_SECS = 600;
const RESEND_COOLDOWN_SECS = 60;

function fmtSecs(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onLogin: (user: AuthUser) => void;
  onGoRegister: () => void;
  onGoForgot: () => void;
}

export default function LoginPage({ onLogin, onGoRegister, onGoForgot }: Props) {
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [secsLeft, setSecsLeft] = useState(OTP_VALID_SECS);
  const [resendCooldown, setResendCooldown] = useState(0);

  function switchMode(next: 'otp' | 'password') {
    setMode(next);
    setError('');
    setCode('');
    setPassword('');
    setDevCode('');
    setStep('email');
  }

  function finishLogin(res: {
    user_id: string;
    email: string;
    name: string;
    access_token: string;
    is_admin: boolean;
  }) {
    const user: AuthUser = {
      userId: res.user_id,
      email: res.email,
      name: res.name,
      token: res.access_token,
      isAdmin: res.is_admin,
    };
    saveSession(res.access_token, user);
    onLogin(user);
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginPassword(email.trim().toLowerCase(), password);
      finishLogin(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step !== 'code') return;
    setSecsLeft(OTP_VALID_SECS);
    const id = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginSendOtp(email.trim().toLowerCase());
      setDevCode(res.dev_code ?? '');
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN_SECS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setLoading(true);
    try {
      const res = await loginSendOtp(email.trim().toLowerCase());
      setDevCode(res.dev_code ?? '');
      setSecsLeft(OTP_VALID_SECS);
      setResendCooldown(RESEND_COOLDOWN_SECS);
      setCode('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginVerify(email.trim().toLowerCase(), code.trim());
      finishLogin(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-logo">
          <svg width="48" height="48" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="auth-logo-g" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#22b8c2"/>
                <stop offset="100%" stopColor="#0c5561"/>
              </linearGradient>
            </defs>
            <circle cx="19" cy="19" r="18.5" fill="url(#auth-logo-g)"/>
            <rect x="7" y="23" width="5" height="8" rx="2.5" fill="rgba(255,255,255,0.5)"/>
            <rect x="14" y="18" width="5" height="13" rx="2.5" fill="rgba(255,255,255,0.7)"/>
            <rect x="21" y="15" width="5" height="16" rx="2.5" fill="rgba(255,255,255,0.88)"/>
            <rect x="28" y="20" width="4" height="11" rx="2" fill="rgba(255,255,255,0.6)"/>
            <circle cx="19" cy="10" r="5.5" fill="rgba(255,228,100,0.92)"/>
            <text x="19" y="10" textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="bold" fill="#0c4a50" fontFamily="'Trebuchet MS',Arial,sans-serif">₪</text>
          </svg>
        </div>

        <h1 className="auth-title">כניסה לחשבון</h1>
        <p className="auth-subtitle">
          {mode === 'otp' ? 'נשלח קוד אימות למייל שלך' : 'התחבר עם המייל והסיסמה שלך'}
        </p>

        <div className="auth-mode-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'otp'}
            className={mode === 'otp' ? 'auth-mode-btn active' : 'auth-mode-btn'}
            onClick={() => switchMode('otp')}
          >
            קוד למייל
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            className={mode === 'password' ? 'auth-mode-btn active' : 'auth-mode-btn'}
            onClick={() => switchMode('password')}
          >
            קוד וסיסמה
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="auth-form">
            <label className="field-block">
              <span>כתובת מייל</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                dir="ltr"
                autoComplete="username"
              />
            </label>
            <label className="field-block">
              <span>סיסמה</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                dir="ltr"
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="primary-button auth-submit" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה לחשבון'}
            </button>
            <p className="auth-hint" style={{ marginTop: '0.5rem' }}>
              עדיין אין לך סיסמה? התחבר עם <button type="button" className="link-btn" onClick={() => switchMode('otp')}>קוד למייל</button> והגדר סיסמה במסך "המשתמש שלי".
            </p>
          </form>
        ) : step === 'email' ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <label className="field-block">
              <span>כתובת מייל</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                dir="ltr"
              />
            </label>
            <button type="submit" className="primary-button auth-submit" disabled={loading}>
              {loading ? 'שולח...' : 'שלח קוד אימות'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <p className="auth-hint">קוד נשלח לכתובת <strong dir="ltr">{email}</strong></p>
            {devCode && (
              <div className="dev-code-banner">
                🔧 סביבת פיתוח — קוד: <strong dir="ltr">{devCode}</strong>
              </div>
            )}
            <div className={`otp-timer${secsLeft <= 60 ? ' otp-timer--urgent' : ''}`}>
              {secsLeft > 0 ? `הקוד תקף עוד ${fmtSecs(secsLeft)}` : 'הקוד פג תוקף — שלח קוד חדש'}
            </div>
            <label className="field-block">
              <span>קוד אימות (6 ספרות)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus
                dir="ltr"
                className="otp-input"
              />
            </label>
            <button type="submit" className="primary-button auth-submit" disabled={loading || secsLeft === 0}>
              {loading ? 'מאמת...' : 'כניסה לחשבון'}
            </button>
            <button
              type="button"
              className="ghost-button auth-resend"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0 ? `שלח שוב (${resendCooldown})` : 'שלח קוד שוב'}
            </button>
            <button
              type="button"
              className="ghost-button auth-back"
              onClick={() => { setStep('email'); setCode(''); setError(''); setDevCode(''); }}
            >
              ← שנה מייל
            </button>
          </form>
        )}

        <div className="auth-links">
          <button type="button" className="link-btn" onClick={onGoForgot}>
            שכחתי גישה לחשבון
          </button>
          <span className="auth-sep">|</span>
          <button type="button" className="link-btn" onClick={onGoRegister}>
            עדיין לא רשום? הרשמה
          </button>
        </div>
      </div>
    </div>
  );
}
