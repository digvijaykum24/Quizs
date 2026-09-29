import { useState } from 'react';
import { fmtDate, initials, pctOf } from '../utils.js';
import { ConfirmModal } from './ui.jsx';

/* Simple strength meter: length + character variety */
function strength(p) {
  let s = 0; if (p.length >= 6) s++; if (p.length >= 10) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return [['', 'transparent'], ['Weak', 'var(--bad)'], ['Fair', 'var(--amber)'], ['Good', '#22C55E'], ['Strong', 'var(--ok)'], ['Very strong', 'var(--ok)']][Math.min(5, s)].concat([s / 5]);
}

export function NameForm({ user, onUpdateName, onToast }) {
  const [name, setName] = useState(user.name); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== user.name;
  const submit = async e => {
    e.preventDefault(); if (busy || !dirty) return;
    setBusy(true); const r = await onUpdateName(name); setBusy(false);
    if (r.error) setErr(r.error); else { setErr(''); onToast('Display name updated'); }
  };
  return (
    <form className="card panel" onSubmit={submit} noValidate>
      <h3>👤 Profile</h3>
      <div className="field"><label htmlFor="accName">Display name</label><input id="accName" value={name} onChange={e => { setName(e.target.value); setErr(''); }} autoComplete="name" /></div>
      <div className="field"><label htmlFor="accEmail">Email</label><input id="accEmail" value={user.email} disabled style={{ opacity: 0.7 }} /><small style={{ fontSize: 12.5, color: 'var(--muted)' }}>Your email is your login and cannot be changed here.</small></div>
      {err && <div className="form-err" role="alert">⚠️ {err}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save name'}</button>
    </form>
  );
}

export function PasswordForm({ onUpdatePassword, onToast }) {
  const [f, setF] = useState({ cur: '', p1: '', p2: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => { setF(x => ({ ...x, [k]: e.target.value })); setErr(''); };
  const [label, color, pct] = strength(f.p1);
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    if (!f.cur) return setErr('Enter your current password.');
    if (f.p1.length < 6) return setErr('New password must be at least 6 characters.');
    if (f.p1 === f.cur) return setErr('New password must be different from the current one.');
    if (f.p1 !== f.p2) return setErr('New passwords do not match.');
    setBusy(true); const r = await onUpdatePassword({ currentPassword: f.cur, newPassword: f.p1 }); setBusy(false);
    if (r.error) setErr(r.error); else { setF({ cur: '', p1: '', p2: '' }); setErr(''); onToast('Password changed successfully'); }
  };
  return (
    <form className="card panel" onSubmit={submit} noValidate>
      <h3>🔒 Change password</h3>
      <div className="field"><label htmlFor="pwCur">Current password</label><input id="pwCur" type="password" value={f.cur} onChange={set('cur')} autoComplete="current-password" /></div>
      <div className="field"><label htmlFor="pwNew">New password</label><input id="pwNew" type="password" value={f.p1} onChange={set('p1')} autoComplete="new-password" /></div>
      {f.p1 && <><div className="pw-strength"><i style={{ width: `${pct * 100}%`, background: color }} /></div><small style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: -6, marginBottom: 12 }}>Strength: <b style={{ color }}>{label}</b> — use 10+ characters with numbers and symbols.</small></>}
      <div className="field"><label htmlFor="pwNew2">Confirm new password</label><input id="pwNew2" type="password" value={f.p2} onChange={set('p2')} autoComplete="new-password" /></div>
      {err && <div className="form-err" role="alert">⚠️ {err}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}

export default function Account({ user, attempts, onUpdateName, onUpdatePassword, onToast, onNav, onLogout }) {
  const [confirm, setConfirm] = useState(false);
  const admin = user.role === 'admin';
  const avg = attempts.length ? Math.round(attempts.reduce((s, a) => s + pctOf(a), 0) / attempts.length) : 0;
  const best = attempts.length ? Math.max(...attempts.map(pctOf)) : 0;
  return (
    <main>
      <div className="container account">
        <div className="card acct-hero">
          <span className="avatar" style={{ background: admin ? 'var(--grad-exam)' : user.color }}>{initials(user.name)}</span>
          <div>
            <h1>{user.name}</h1>
            <div className="meta"><span>{user.email}</span><span className={`chip ${admin ? 'mixed' : 'easy'}`}>{admin ? 'Admin' : 'Student'}</span><span>Member since {fmtDate(user.joined)}</span></div>
          </div>
          {!admin && <div className="acct-stats"><div><b>{attempts.length}</b><span>Quizzes</span></div><div><b>{avg}%</b><span>Average</span></div><div><b>{best}%</b><span>Best</span></div></div>}
        </div>
        <div className="acct-grid">
          <NameForm user={user} onUpdateName={onUpdateName} onToast={onToast} />
          <PasswordForm onUpdatePassword={onUpdatePassword} onToast={onToast} />
        </div>
        <div className="card panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div><b style={{ fontFamily: 'var(--font-display)' }}>Quick links</b><div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{admin ? 'Manage questions, students and the admin invite code.' : 'See your progress, streaks and badges.'}</div></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {admin ? <button className="btn btn-orange" onClick={() => onNav('#admin')}>🛡️ Admin panel</button> : <button className="btn btn-primary" onClick={() => onNav('#dashboard')}>📊 My dashboard</button>}
            <button className="btn btn-ghost" onClick={() => setConfirm(true)}>🚪 Log out</button>
          </div>
        </div>
      </div>
      {confirm && <ConfirmModal emoji="🚪" title="Log out?" text="You can log back in any time with your email and password." cancel="Stay" ok="Log out" okClass="btn-primary" onOk={() => { setConfirm(false); onLogout(); }} onClose={() => setConfirm(false)} />}
    </main>
  );
}
