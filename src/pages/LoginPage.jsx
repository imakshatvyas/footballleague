import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, sendPasswordReset } from '../services/authService';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
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
      }
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Something went wrong');
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
              autoComplete="email"
            />
          </div>
          {mode !== 'forgot' && (
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
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : (
              mode === 'forgot' ? 'Send reset link' : (mode === 'login' ? 'Sign in' : 'Create account')
            )}
          </button>
          {mode === 'forgot' && (
            <button
              type="button"
              className="login-back-btn"
              onClick={() => setMode('login')}
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

