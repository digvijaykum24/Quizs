import { useEffect, useState } from 'react';
import { BADGES } from '../data.js';
import { useGrow } from '../hooks/index.js';

export const Icon = {
  Star: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 14.7 7 17.4l1.1-5.6L4 7.9l5.6-.7z" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>,
  Cross: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  Arrow: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  Timer: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" /></svg>,
  Target: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>,
  Trophy: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" /></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
};

export function Brand({ onClick }) {
  return <a className="brand" href="#top" onClick={onClick}><span className="brand-mark" aria-hidden="true"><Icon.Star /></span>QuizArena</a>;
}

/* Progress bar that animates from 0 on mount */
export function Bar({ value, gradient, className = '', style }) {
  const w = useGrow(value);
  return <div className={`bar ${className}`} style={style}><i style={{ width: `${w}%`, background: gradient }} /></div>;
}

export function BadgeGrid({ stats }) {
  return (
    <div className="ach-grid">
      {BADGES.map(b => {
        const ok = b.check(stats); const pr = Math.round(b.progress(stats) * 100);
        return (
          <div key={b.id} className={`card ach ${ok ? 'unlocked' : 'locked'}`} title={b.desc}>
            {!ok && <span className="lock">🔒</span>}
            <span className="medal" style={ok ? { background: b.grad } : undefined}>{b.icon}</span>
            <b>{b.name}</b>
            <small>{ok ? 'Unlocked' : b.desc}</small>
            {!ok && <div className="bar"><i style={{ width: `${pr}%` }} /></div>}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({ emoji, title, text, children, error }) {
  return (
    <div className={error ? 'error-state' : 'empty'}>
      <div className="em">{emoji}</div><h4>{title}</h4><p>{text}</p>{children}
    </div>
  );
}

/* ---------- Modals ---------- */
export function Modal({ onClose, wide, children }) {
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-box${wide ? ' wide' : ''}`}>{children}</div>
    </div>
  );
}

export function ModalHead({ title, onClose }) {
  return <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>;
}

export function ConfirmModal({ emoji, title, text, cancel, ok, okClass = 'btn-orange', onOk, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>{emoji}</div>
        <h3 style={{ fontSize: 20, margin: '10px 0 6px' }}>{title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14.5 }}>{text}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>{cancel}</button>
          <button className={`btn ${okClass}`} onClick={onOk} autoFocus>{ok}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Shown when the user lands from a password-reset email */
export function SetPasswordModal({ onSubmit, onClose }) {
  const [p1, setP1] = useState(''); const [p2, setP2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    if (p1 !== p2) return setErr('Passwords do not match.');
    setBusy(true); const r = await onSubmit(p1); setBusy(false);
    if (r?.error) setErr(r.error);
  };
  return (
    <Modal onClose={onClose}>
      <ModalHead title="Choose a new password" onClose={onClose} />
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="npw1">New password</label><input id="npw1" type="password" value={p1} onChange={e => { setP1(e.target.value); setErr(''); }} autoComplete="new-password" autoFocus /></div>
        <div className="field"><label htmlFor="npw2">Confirm new password</label><input id="npw2" type="password" value={p2} onChange={e => { setP2(e.target.value); setErr(''); }} autoComplete="new-password" /></div>
        {err && <div className="form-err" role="alert">⚠️ {err}</div>}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </Modal>
  );
}

/* Full-page prompt shown in place of a page that needs an account */
/* Logged-in user chip with a small menu */
export function UserChip({ user, onNav, onLogout }) {
  const [open, setOpen] = useState(false);
  const admin = user.role === 'admin';
  return (
    <div className="user-chip-wrap">
      <button className="user-chip" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="avatar" style={{ background: admin ? 'var(--grad-exam)' : user.color, width: 32, height: 32, fontSize: 12 }}>{user.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
        <span className="uc-name">{user.name.split(' ')[0]}</span>
        {admin && <span className="chip mixed" style={{ padding: '2px 7px', fontSize: 11 }}>Admin</span>}
      </button>
      {open && (
        <div className="user-menu" onMouseLeave={() => setOpen(false)}>
          <div className="um-head"><b>{user.name}</b><span>{user.email}</span></div>
          {admin ? <button onClick={() => { setOpen(false); onNav('#admin'); }}>🛡️ Admin panel</button> : <button onClick={() => { setOpen(false); onNav('#dashboard'); }}>📊 My dashboard</button>}
          <button onClick={() => { setOpen(false); onNav('#account'); }}>⚙️ Account settings</button>
          <button onClick={() => { setOpen(false); onLogout(); }}>🚪 Log out</button>
        </div>
      )}
    </div>
  );
}

export function PickerModal({ quizzes, onStart, onClose }) {
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title="Pick a quiz to start" onClose={onClose} />
      <div className="picker">
        {quizzes.map(q => (
          <button key={q.id} className="picker-item" onClick={() => onStart(q.id)}>
            <span className="ic" style={{ background: q.grad }}>{q.icon}</span>
            <div><b>{q.title}</b><span>{q.questions.length} questions · {q.minutes} min · {q.difficulty}</span></div>
            <span className="go">Start →</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function CategoryModal({ cat, onClose, onToast }) {
  const [busy, setBusy] = useState(false);
  const retry = () => { setBusy(true); setTimeout(() => { setBusy(false); onToast('Still offline — try again in a moment'); }, 1200); };
  return (
    <Modal onClose={onClose}>
      <ModalHead title={`${cat.icon} ${cat.name}`} onClose={onClose} />
      {cat.state === 'error' ? (
        <EmptyState error emoji="⚠️" title="Couldn't load quizzes" text="The Current Affairs feed didn't respond. Check your connection and try again.">
          <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={busy} onClick={retry}>{busy ? 'Retrying…' : 'Retry'}</button>
        </EmptyState>
      ) : (
        <EmptyState emoji="📭" title="No quizzes here yet" text={`We're adding ${cat.name} quizzes this month. Get notified when they land.`}>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { onClose(); onToast(`We'll notify you when ${cat.name} quizzes go live`); }}>🔔 Notify me</button>
        </EmptyState>
      )}
    </Modal>
  );
}

export function Toast({ msg, show }) {
  return <div className={`toast${show ? ' show' : ''}`} role="status" aria-live="polite">{msg}</div>;
}

export function UnlockToast({ badge }) {
  return (
    <div className={`unlock${badge ? ' show' : ''}`} aria-live="polite">
      <span className="medal" style={{ background: badge?.grad }}>{badge?.icon || '🏆'}</span>
      <div><small>Achievement unlocked</small><b>{badge?.name || ''}</b></div>
    </div>
  );
}
