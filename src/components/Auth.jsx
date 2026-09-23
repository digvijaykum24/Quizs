import { useState } from 'react';
import { Modal, ModalHead } from './ui.jsx';

/* ---------------------------------------------------------------------------
   One auth section for everyone: students and admins log in with the same form
   (the account's own role decides where they land), sign up in the same card,
   and reset a forgotten password without leaving it.
--------------------------------------------------------------------------- */
export function AuthPanel({ initialMode = 'login', reason, onLogin, onSignup, onReset, onDone }) {
  const [mode, setMode] = useState(initialMode); // login | signup | reset
  const [f, setF] = useState({ name: '', email: '', password: '', code: '' });
  const [showCode, setShowCode] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const signup = mode === 'signup';
  const reset = mode === 'reset';
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setErr(''); };
  const go = m => { setMode(m); setErr(''); setInfo(''); };

  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(''); setInfo('');
    try {
      const r = (reset
        ? await onReset(f.email)
        : signup
          ? await onSignup({ ...f, role: showCode && f.code.trim() ? 'admin' : 'student' })
          : await onLogin(f.email, f.password)) || {};
      if (r.error) setErr(r.error);
      else if (r.info) { setInfo(r.info); if (!reset) setMode('login'); }
      else if (r.user && onDone) onDone(r.user);
    } catch (ex) { setErr(ex.message || 'Something went wrong. Please try again.'); }
    setBusy(false);
  };

  return (
    <div className="auth-panel">
      {reason && <div className="login-reason">🔒 {reason}</div>}

      <div className="auth-switch" role="tablist" aria-label="Log in or sign up">
        <button role="tab" type="button" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => go('login')}>Log in</button>
        <button role="tab" type="button" aria-selected={signup} className={signup ? 'active' : ''} onClick={() => go('signup')}>Sign up</button>
        <span className="auth-ind" style={{ transform: `translateX(${signup ? 100 : 0}%)` }} aria-hidden="true" />
      </div>

      {reset ? (
        <form onSubmit={submit} noValidate>
          <p className="auth-hint">Enter the email for your account — student or admin — and we'll send a link to choose a new password.</p>
          <div className="field"><label htmlFor="authEmail">Email</label><input id="authEmail" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="username" autoFocus /></div>
          {err && <div className="form-err" role="alert">⚠️ {err}</div>}
          {info && <div className="form-info" role="status">📬 {info}</div>}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" className="link-btn auth-back" onClick={() => go('login')}>← Back to log in</button>
        </form>
      ) : (
        <form onSubmit={submit} noValidate>
          {signup && <div className="field"><label htmlFor="authName">Full name</label><input id="authName" value={f.name} onChange={set('name')} placeholder="Aarav Sharma" autoComplete="name" /></div>}
          <div className="field"><label htmlFor="authEmail">Email</label><input id="authEmail" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="username" /></div>
          <div className="field">
            <label htmlFor="authPass">Password</label>
            <input id="authPass" type="password" value={f.password} onChange={set('password')} placeholder="••••••••" autoComplete={signup ? 'new-password' : 'current-password'} />
          </div>

          {signup && (showCode
            ? <div className="field"><label htmlFor="authCode">Admin invite code</label><input id="authCode" value={f.code} onChange={set('code')} placeholder="Ask your site admin" autoComplete="off" autoFocus /><small className="auth-note">Leave this blank and you'll get a normal student account.</small></div>
            : <button type="button" className="link-btn auth-code-toggle" onClick={() => setShowCode(true)}>🛡️ I have an admin invite code</button>)}

          {!signup && <div className="auth-forgot"><button type="button" className="link-btn" onClick={() => go('reset')}>Forgot password?</button></div>}

          {err && <div className="form-err" role="alert">⚠️ {err}</div>}
          {info && <div className="form-info" role="status">📬 {info}</div>}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : signup ? 'Create free account' : 'Log in'}
          </button>
          <p className="auth-foot">
            {signup
              ? <>Already have an account? <button type="button" className="link-btn" onClick={() => go('login')}>Log in</button></>
              : <>New here? <button type="button" className="link-btn" onClick={() => go('signup')}>Create a free account</button> · Admins log in here too.</>}
          </p>
        </form>
      )}
    </div>
  );
}

/* The same panel inside a dialog, for prompts that appear mid-flow */
export function AuthModal({ onClose, initialMode, reason, ...handlers }) {
  return (
    <Modal onClose={onClose}>
      <ModalHead title="Welcome to QuizArena" onClose={onClose} />
      <AuthPanel initialMode={initialMode} reason={reason} {...handlers} />
    </Modal>
  );
}

/* The same panel as a full page at #login */
export function AuthPage({ initialMode, reason, onNav, ...handlers }) {
  const points = [
    ['🏆', 'Your name on the leaderboard', 'Scores from every quiz you finish are ranked against other students.'],
    ['📊', 'Progress that follows you', 'Streaks, accuracy and badges saved to your account, on any device.'],
    ['🛡️', 'Admins use this same form', 'Log in with your admin account and you land straight in the admin panel.']
  ];
  return (
    <main>
      <div className="container auth-page">
        <div className="auth-side">
          <h1>One account for everything</h1>
          <p>Playing quizzes is free and needs no account. Log in only when you want to be ranked — or to manage the site as an admin.</p>
          <ul>
            {points.map(p => <li key={p[1]}><span aria-hidden="true">{p[0]}</span><div><b>{p[1]}</b><span>{p[2]}</span></div></li>)}
          </ul>
          <button className="btn btn-ghost" onClick={() => onNav('#top')}>← Back to quizzes</button>
        </div>
        <div className="card auth-card">
          <AuthPanel initialMode={initialMode} reason={reason} {...handlers} />
        </div>
      </div>
    </main>
  );
}
