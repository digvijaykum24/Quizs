import { useEffect, useState } from 'react';
import { Brand, Icon, UserChip } from './ui.jsx';

/* Public links. Dashboard is added only once someone is logged in, and Admin only for admins. */
const LINKS = [
  ['#top', 'Home', '🏠'], ['#quizzes', 'Quizzes', '🎯'], ['#duel', 'Duel', '⚔️'], ['#categories', 'Categories', '📚'],
  ['#leaderboard', 'Leaderboard', '🏆']
];

/* NavLink: every nav element goes through onNav so section scrolling / page switching is handled in one place */
function NavLink({ href, active, onNav, className = '', children }) {
  return <a href={href} className={`${className}${active === href ? ' active' : ''}`.trim()} onClick={e => { e.preventDefault(); onNav(href); }}>{children}</a>;
}

export function Navbar({ active, onNav, onLogin, onPick, user, onLogout }) {
  const links = user
    ? (user.role === 'admin'
        ? [...LINKS, ['#admin', 'Admin', '🛡️']]
        : [...LINKS, ['#dashboard', 'Dashboard', '📊']])
    : LINKS;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f);
  }, []);
  const nav = href => { setOpen(false); onNav(href); };
  return (
    <>
      <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <Brand onClick={e => { e.preventDefault(); nav('#top'); }} />
          <nav className="nav-links" aria-label="Primary">
            {links.map(([h, l]) => <NavLink key={h} href={h} active={active} onNav={nav}>{l}</NavLink>)}
          </nav>
          <div className="nav-actions">
            {user ? <UserChip user={user} onNav={nav} onLogout={onLogout} /> : <button className="btn btn-ghost btn-login" onClick={onLogin}><span className="btn-ico"><Icon.User /></span>Login / Sign Up</button>}
            <button className="btn btn-primary" onClick={onPick}>▶ Start Quiz</button>
          </div>
          <button className="icon-btn nav-toggle" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(o => !o)}><Icon.Menu /></button>
        </div>
      </header>
      <div className={`mobile-menu${open ? ' open' : ''}`}>
        {links.map(([h, l, e]) => <NavLink key={h} href={h} active={active} onNav={nav}>{e} {l}</NavLink>)}
        <div className="mm-actions">
          {user && <div className="mm-user"><span className="avatar" style={{ background: user.role === 'admin' ? 'var(--grad-exam)' : user.color }}>{user.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span><div><b>{user.name}</b><span>{user.email}</span></div></div>}
          <button className="btn btn-primary btn-lg" onClick={() => { setOpen(false); onPick(); }}>▶ Start Quiz</button>
          {user && <button className="btn btn-ghost" onClick={() => nav('#account')}>⚙️ Account settings</button>}
          {user ? <button className="btn btn-ghost" onClick={() => { setOpen(false); onLogout(); }}>🚪 Log out</button> : <button className="btn btn-ghost btn-login" onClick={() => { setOpen(false); onLogin(); }}><span className="btn-ico"><Icon.User /></span>Login / Sign Up</button>}
        </div>
      </div>
    </>
  );
}

export function BottomNav({ active, onNav, user }) {
  const items = [['#top', 'Home', <Icon.Home />], ['#quizzes', 'Quizzes', <Icon.Target />], ['#duel', 'Duel', <span className="bn-emoji" aria-hidden="true">⚔️</span>], ['#leaderboard', 'Board', <Icon.Trophy />]];
  if (user) items.push(user.role === 'admin' ? ['#admin', 'Admin', <Icon.Chart />] : ['#dashboard', 'Dashboard', <Icon.Chart />]);
  return (
    <nav className="bottom-nav" aria-label="Mobile">
      {items.map(([h, l, ic]) => <NavLink key={h} href={h} active={active} onNav={onNav}>{ic}{l}</NavLink>)}
    </nav>
  );
}

export function Footer({ onNav, live }) {
  const go = h => e => { e.preventDefault(); onNav(h); };
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand onClick={go('#top')} />
            <p>A gamified practice platform for school students and competitive-exam aspirants. Play, score, compete and improve every day.</p>
            <div className="socials" aria-label="Social media">
              <a href="#" aria-label="YouTube" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8zM9.7 15.1V8.9l6.1 3.1z" /></svg></a>
              <a href="#" aria-label="Instagram" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg></a>
              <a href="#" aria-label="Telegram" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3L2.7 11.7c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 11.4-7.2c.5-.3 1-.1.6.2l-9.2 8.3-.3 5c.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.1c.3-1.3-.5-1.9-1.3-1.7z" /></svg></a>
              <a href="#" aria-label="X" onClick={e => e.preventDefault()}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L4.9 21H1.8l7.3-8.3L1.4 3h6.4l4.4 5.9zm-1.1 16.2h1.7L6.9 4.7H5.1z" /></svg></a>
            </div>
          </div>
          <div><h4>Platform</h4><ul><li><a href="#top" onClick={go('#top')}>About</a></li><li><a href="#categories" onClick={go('#categories')}>Quiz Categories</a></li><li><a href="#quizzes" onClick={go('#quizzes')}>Mock Tests</a></li><li><a href="#duel" onClick={go('#duel')}>Live Duel</a></li><li><a href="#leaderboard" onClick={go('#leaderboard')}>Leaderboard</a></li></ul></div>
          <div><h4>Exams</h4><ul><li><a href="#quizzes" onClick={go('#quizzes')}>SSC CGL / CHSL</a></li><li><a href="#quizzes" onClick={go('#quizzes')}>Banking (IBPS / SBI)</a></li><li><a href="#quizzes" onClick={go('#quizzes')}>Railway NTPC</a></li><li><a href="#quizzes" onClick={go('#quizzes')}>UPSC Prelims</a></li></ul></div>
          <div><h4>Support</h4><ul><li><a href="#account" onClick={go('#account')}>My account</a></li><li><a href="#login" onClick={go('#login')}>Log in / Sign up</a></li><li><a href="#" onClick={e => e.preventDefault()}>Contact</a></li><li><a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a></li><li><a href="#" onClick={e => e.preventDefault()}>Terms &amp; Conditions</a></li><li><a href="#" onClick={e => e.preventDefault()}>Help Centre</a></li></ul></div>
        </div>
        <div className="footer-bottom"><span>© 2026 QuizArena. Made for learners across India.</span><span>{live ? 'Accounts & scores secured with Supabase' : 'Demo mode — data stays in this browser'}</span></div>
      </div>
    </footer>
  );
}
