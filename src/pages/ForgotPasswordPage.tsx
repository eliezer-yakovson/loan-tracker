import { type FormEvent, useEffect, useState } from 'react';
import { resetSendOtp, resetVerify, saveSession } from '../authApi';
import type { AuthUser } from '../types';

const OTP_VALID_SECS = 600;
const RESEND_COOLDOWN_SECS = 60;

function fmtSecs(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onLogin: (user: AuthUser) => void;
  onGoLogin: () => void;
}

export default function ForgotPasswordPage({ onLogin, onGoLogin }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [secsLeft, setSecsLeft] = useState(OTP_VALID_SECS);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      const res = await resetSendOtp(email.trim().toLowerCase());
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
      const res = await resetSendOtp(email.trim().toLowerCase());
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
      const res = await resetVerify(email.trim().toLowerCase(), code.trim());
      const user: AuthUser = {
        userId: res.user_id,
        email: res.email,
        name: res.name,
        token: res.access_token,
        isAdmin: res.is_admin,
      };
      saveSession(res.access_token, user);
      onLogin(user);
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
          <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>🔑</span>
        </div>

        <h1 className="auth-title">שכחתי גישה</h1>
        <p className="auth-subtitle">
          נשלח קוד אימות למייל שלך — לאחר אימות תהיה מחובר מחדש
        </p>

        {error && <div className="auth-error">{error}</div>}

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="auth-form">
            <label className="field-block">
              <span>כתובת מייל רשומה</span>
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
              {loading ? 'שולח...' : 'שלח קוד גישה'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerify} className="auth-form">
            <p className="auth-hint">
              אם המייל <strong dir="ltr">{email}</strong> רשום במערכת, קוד נשלח אליו.
            </p>
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
              {loading ? 'מאמת...' : 'אמת וכנס לחשבון'}
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
          <button type="button" className="link-btn" onClick={onGoLogin}>
            ← חזרה לכניסה
          </button>
        </div>
      </div>
    </div>
  );
}
