import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, sendPasswordReset, signInWithGoogle, linkGoogleAccount } from '../services/authService';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [pendingGoogleCred, setPendingGoogleCred] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(email, password);
        navigate('/');
      } else if (mode === 'register') {
        if (!name.trim()) { toast.error('Enter your name'); return; }
        await registerUser(email, password, name.trim());
        navigate('/');
      } else if (mode === 'forgot') {
        if (!email.trim()) { toast.error('Enter your email'); return; }
        await sendPasswordReset(email.trim());
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'link') {
        if (!password) { toast.error('Enter your password'); return; }
        await linkGoogleAccount(email, password, pendingGoogleCred);
        toast.success('Accounts merged successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error === 'link_required') {
        setPendingGoogleCred(res.pendingCredential);
        setEmail(res.email);
        setPassword('');
        setMode('link');
        toast.error('An account already exists with this email. Enter your password to merge them.');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">⚽</div>
        <h1 className="login-title">Prediction League</h1>
        <p className="login-sub">Compete with friends on every match</p>

        {mode === 'forgot' ? (
          <div className="login-reset-header">
            <h2 className="login-reset-title">Reset Password</h2>
            <p className="login-reset-sub">We will send a recovery link to your email</p>
          </div>
        ) : mode === 'link' ? (
          <div className="login-reset-header">
            <h2 className="login-reset-title">Merge Accounts</h2>
            <p className="login-reset-sub">Enter the password for {email} to link Google</p>
          </div>
        ) : (
          <div className="login-toggle">
            <button
              className={`login-toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >Sign in</button>
            <button
              className={`login-toggle-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >Create account</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-label">Your name</label>
              <input
                className="login-input"
                type="text"
                placeholder="e.g. Marcus Johnson"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={mode === 'link'}
              autoComplete="email"
            />
          </div>
          {(mode === 'login' || mode === 'register' || mode === 'link') && (
            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="login-forgot-btn"
                    onClick={() => setMode('forgot')}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                className="login-input"
                type="password"
                placeholder={mode === 'link' ? 'Enter existing password' : 'At least 6 characters'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
          )}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : (
              mode === 'forgot' ? 'Send reset link' : (
                mode === 'link' ? 'Merge & Link Accounts' : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )
              )
            )}
          </button>
          {(mode === 'forgot' || mode === 'link') && (
            <button
              type="button"
              className="login-back-btn"
              onClick={() => {
                setMode('login');
                setPendingGoogleCred(null);
              }}
            >
              Cancel and back to sign in
            </button>
          )}
        </form>

        {mode !== 'forgot' && mode !== 'link' && (
          <>
            <div className="login-divider"><span>or</span></div>
            <button
              type="button"
              className="login-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="login-google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

