import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BADGES, GUEST } from './data.js';
import { backend, isLive } from './backend/index.js';
import { useAttempts, useAuth, useQuizzes, useScrollSpy, useToast, useUsers } from './hooks/index.js';
import { computeStats, pointsFor, reduced, SECTIONS, store, unlockedIds } from './utils.js';
import { BottomNav, Footer, Navbar } from './components/Layout.jsx';
import Home from './components/Home.jsx';
import Dashboard from './components/Dashboard.jsx';
import Admin from './components/Admin.jsx';
import Account from './components/Account.jsx';
import Duel from './components/Duel.jsx';
import Quiz from './components/Quiz.jsx';
import Result from './components/Result.jsx';
import { CategoryModal, PickerModal, SetPasswordModal, Toast, UnlockToast } from './components/ui.jsx';
import { AuthModal, AuthPage } from './components/Auth.jsx';

const PAGES = { '#dashboard': 'dashboard', '#admin': 'admin', '#account': 'account', '#login': 'login', '#duel': 'duel' };
const TITLES = { home: 'QuizArena — Play quizzes, climb the leaderboard', dashboard: 'My Dashboard · QuizArena', admin: 'Admin Panel · QuizArena', account: 'Account Settings · QuizArena', login: 'Log in or sign up · QuizArena', duel: 'Live Duel · QuizArena', quiz: 'Quiz in progress · QuizArena', result: 'Your Result · QuizArena' };

export default function App() {
  const [view, setView] = useState(() => PAGES[location.hash] || 'home'); // home | dashboard | admin | quiz | result
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [modal, setModal] = useState(null); // {type:'login'|'picker'|'category', cat?, role?, mode?, reason?, next?}
  const [unlock, setUnlock] = useState(null);
  const { user, ready, login, signup, logout, updateName, recovery, setRecovery } = useAuth();
  const { users } = useUsers(user);
  const { attempts, loading: attemptsLoading, addAttempt, claimGuest, guestCount } = useAttempts(user);
  const { quizzes, byId, addQuestion, removeQuestion, resetQuiz } = useQuizzes();
  const { msg, show, toast } = useToast();
  const { active, setActive, jump } = useScrollSpy(view === 'home', SECTIONS);
  const pendingJump = useRef(null);

  const me = user || GUEST;
  const myAttempts = useMemo(() => attempts.filter(a => a.user === me.id), [attempts, me.id]);
  const stats = useMemo(() => computeStats(myAttempts, byId), [myAttempts, byId]);

  /* ---- navigation: one handler for navbar, mobile menu, bottom nav and footer ---- */
  const navigate = useCallback(href => {
    const page = PAGES[href];
    if (page) { setView(page); setActive(href); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); history.replaceState(null, '', href); return; }
    if (view === 'home') jump(href); else { pendingJump.current = href; setView('home'); }
  }, [view, jump, setActive]);
  useEffect(() => {
    if (view === 'home' && pendingJump.current) { const h = pendingJump.current; pendingJump.current = null; requestAnimationFrame(() => jump(h)); }
    if (PAGES['#' + view]) setActive('#' + view);
  }, [view, jump, setActive]);
  useEffect(() => {
    const onHash = () => { const h = location.hash; if (PAGES[h] || SECTIONS.includes(h)) navigate(h); };
    window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash);
  }, [navigate]);
  useEffect(() => { if (SECTIONS.includes(location.hash)) setTimeout(() => jump(location.hash), 50); }, []); // eslint-disable-line

  /* ---- body chrome ---- */
  const inQuiz = view === 'quiz';
  useEffect(() => { document.title = TITLES[view] || 'QuizArena'; }, [view]);
  useEffect(() => {
    document.body.style.overflow = inQuiz ? 'hidden' : '';
    document.body.classList.toggle('has-bottom-nav', !inQuiz);
  }, [inQuiz]);
  useEffect(() => { if (!attemptsLoading) store.setBadges(unlockedIds(stats)); }, [me.id, attemptsLoading]); // eslint-disable-line

  /* ---- quiz lifecycle: anyone can play; guests' attempts stay in this browser until they sign up ---- */
  const startQuiz = useCallback(id => {
    const q = byId(id); if (!q) return;
    if (!q.questions.length) { toast('This quiz has no questions yet — ask an admin to add some'); return; }
    setModal(null); setQuiz(q); setView('quiz'); window.scrollTo(0, 0);
  }, [byId, toast]);
  const finishQuiz = useCallback(r => {
    const before = store.badges();
    const rec = { user: me.id, quiz: r.quiz.id, score: r.correct, total: r.n, attempted: r.attempted, time: r.time, points: pointsFor({ score: r.correct, time: r.time }, r.quiz), date: new Date().toISOString() };
    addAttempt(rec).catch(e => toast(`Couldn't save this attempt: ${e.message}`));
    setResult(r); setView('result'); window.scrollTo(0, 0);
    const next = unlockedIds(computeStats([rec, ...myAttempts], byId));
    const fresh = next.filter(id => !before.includes(id)); store.setBadges(next);
    if (fresh.length) { setTimeout(() => setUnlock(BADGES.find(b => b.id === fresh[0])), 1400); setTimeout(() => setUnlock(null), 5000); }
  }, [addAttempt, myAttempts, me.id, byId, toast]);
  const exitQuiz = () => { setView('home'); toast('Quiz exited — no attempt saved'); };
  const nextQuiz = () => { const i = quizzes.findIndex(q => q.id === result.quiz.id); startQuiz(quizzes[(i + 1) % quizzes.length].id); };

  /* ---- auth ---- */
  const afterAuth = async (u, greeting) => {
    const next = modal?.next; setModal(null); toast(greeting);
    if (u.role === 'student' && guestCount) {
      const n = await claimGuest(u);
      if (n) setTimeout(() => toast(`${n} guest score${n === 1 ? '' : 's'} added to your profile — you're on the leaderboard!`), 1200);
    }
    if (next?.start) { startQuiz(next.start); return; }
    if (u.role === 'admin') navigate('#admin'); else if (next?.go) navigate(next.go); else if (view === 'result') { /* stay on the result */ } else if (view !== 'home') navigate('#dashboard');
  };
  const onLogin = async (email, password) => {
    const r = await login(email, password);
    if (r.user) afterAuth(r.user, r.user.role === 'admin' ? `Welcome back, ${r.user.name.split(' ')[0]} — admin mode` : `Welcome back, ${r.user.name.split(' ')[0]}!`);
    return r;
  };
  const onSignup = async data => {
    const r = await signup(data);
    if (r.user) afterAuth(r.user, `Account created — welcome, ${r.user.name.split(' ')[0]}!`);
    return r;
  };
  const onLogout = async () => { await logout(); toast('Logged out'); if (view !== 'home') navigate('#top'); };
  const onReset = email => backend.auth.resetPassword(email);
  const onSetPassword = async pw => { const r = await backend.auth.setPassword(pw); if (r.ok) { setRecovery(false); toast('Password updated — you are logged in'); } return r; };

  const explore = c => (c.quiz ? startQuiz(c.quiz) : setModal({ type: 'category', cat: c }));
  const openPicker = () => setModal({ type: 'picker' });
  const openLogin = (mode = 'login', extra = {}) => setModal({ type: 'login', mode, ...extra });
  const authProps = { onLogin, onSignup, onReset };
  const joinBoard = (mode = 'signup') => openLogin(mode, { reason: guestCount ? `Create a free account to put your name on the leaderboard. Your ${guestCount} guest score${guestCount === 1 ? '' : 's'} will be added to your profile.` : 'Create a free account to put your name on the leaderboard and keep your scores across devices.' });

  return (
    <>
      {!inQuiz && <Navbar active={active} onNav={navigate} onLogin={() => navigate('#login')} onPick={openPicker} user={user} onLogout={onLogout} />}
      {view === 'home' && <Home quizzes={quizzes} byId={byId} attempts={myAttempts} allAttempts={attempts} attemptsLoading={attemptsLoading} users={users} stats={stats} me={me} user={user} guestCount={guestCount} onStart={startQuiz} onPick={openPicker} onNav={navigate} onExplore={explore} onLogin={() => navigate('#login')} onJoin={joinBoard} />}
      {view === 'duel' && ready && <Duel user={user} users={users} quizzes={quizzes} byId={byId} onNav={navigate} onToast={toast} />}
      {view === 'dashboard' && ready && <Dashboard quizzes={quizzes} byId={byId} attempts={myAttempts} stats={stats} me={me} user={user} onStart={startQuiz} onJoin={joinBoard} />}
      {view === 'admin' && ready && <Admin admin={user} users={users} attempts={attempts} quizzes={quizzes} byId={byId} addQuestion={addQuestion} removeQuestion={removeQuestion} resetQuiz={resetQuiz} onToast={toast} onLogin={() => navigate('#login')} onNav={navigate} />}
      {(view === 'account' || view === 'login') && ready && (user
        ? <Account user={user} attempts={myAttempts} onUpdateName={updateName} onUpdatePassword={data => backend.auth.updatePassword({ email: user.email, ...data })} onToast={toast} onNav={navigate} onLogout={onLogout} />
        : <AuthPage initialMode="login" reason={view === 'account' ? 'Log in to change your name or password and manage your account.' : ''} onNav={navigate} {...authProps} />)}
      {view === 'result' && result && <Result result={result} user={user} onRetry={() => startQuiz(result.quiz.id)} onNext={nextQuiz} onNav={navigate} onToast={toast} onJoin={joinBoard} />}
      {inQuiz && quiz && <Quiz key={`${quiz.id}-${attempts.length}`} quiz={quiz} onExit={exitQuiz} onFinish={finishQuiz} />}
      {!inQuiz && <Footer onNav={navigate} live={isLive} />}
      {!inQuiz && <BottomNav active={active} onNav={navigate} />}

      {modal?.type === 'login' && <AuthModal initialMode={modal.mode} reason={modal.reason} onClose={() => setModal(null)} {...authProps} />}
      {recovery && <SetPasswordModal onSubmit={onSetPassword} onClose={() => setRecovery(false)} />}
      {modal?.type === 'picker' && <PickerModal quizzes={quizzes} onStart={startQuiz} onClose={() => setModal(null)} />}
      {modal?.type === 'category' && <CategoryModal cat={modal.cat} onClose={() => setModal(null)} onToast={toast} />}
      <Toast msg={msg} show={show} />
      <UnlockToast badge={unlock} />
    </>
  );
}
