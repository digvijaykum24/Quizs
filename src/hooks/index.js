import { useCallback, useEffect, useRef, useState } from 'react';
import { QUIZZES } from '../data.js';
import { backend } from '../backend/index.js';
import { reduced, store } from '../utils.js';

const GUEST_KEY = 'qa_guest_attempts';
const guestStore = {
  get: () => store.read(GUEST_KEY, []),
  set: v => store.write(GUEST_KEY, v.slice(0, 200)),
  clear: () => store.remove(GUEST_KEY)
};

/* ---------- Auth (Supabase or local, see src/backend) ---------- */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    backend.auth.getUser().then(u => { if (alive) { setUser(u); setReady(true); } });
    const off = backend.auth.onChange(u => { if (alive) setUser(u); });
    return () => { alive = false; off(); };
  }, []);
  const login = useCallback(async (email, password) => {
    const r = await backend.auth.signIn({ email, password });
    if (r.user) setUser(r.user);
    return r;
  }, []);
  const signup = useCallback(async data => {
    const r = await backend.auth.signUp(data);
    if (r.user) setUser(r.user);
    return r;
  }, []);
  const logout = useCallback(async () => { await backend.auth.signOut(); setUser(null); }, []);
  const updateName = useCallback(async name => { const r = await backend.auth.updateName(name); if (r.user) setUser(r.user); return r; }, []);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => backend.auth.onRecovery(() => setRecovery(true)), []);
  return { user, ready, login, signup, logout, updateName, recovery, setRecovery };
}

/* ---------- Users: public profiles for the leaderboard; full directory (emails) for admins ---------- */
export function useUsers(user) {
  const [users, setUsers] = useState([]);
  const seq = useRef(0);
  const asAdmin = user?.role === 'admin';
  // only the latest request may write, so a slow public fetch can't overwrite the admin directory
  const reload = useCallback(() => { const n = ++seq.current; return backend.users.list(asAdmin).then(list => { if (n === seq.current) setUsers(list); }); }, [asAdmin]);
  useEffect(() => { reload(); }, [reload, user?.id]);
  return { users, reload };
}

/* ---------- Attempts: everyone's saved attempts (public leaderboard) + this browser's guest attempts.
   Guests play without an account; their attempts stay local and are moved to the account on sign-up/login. ---------- */
export function useAttempts(user) {
  const [remote, setRemote] = useState([]);
  const [guest, setGuest] = useState(() => guestStore.get());
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => backend.attempts.list().then(a => { setRemote(a); setLoading(false); }), []);
  useEffect(() => { reload(); }, [reload, user?.id]);
  const addAttempt = useCallback(async a => {
    if (a.user === 'guest') { const rec = { ...a, id: `g-${Date.now()}` }; setGuest(prev => { const n = [rec, ...prev]; guestStore.set(n); return n; }); return rec; }
    const optimistic = { ...a, id: `tmp-${Date.now()}` };
    setRemote(prev => [optimistic, ...prev]);
    try { const saved = await backend.attempts.add(a); setRemote(prev => prev.map(x => (x.id === optimistic.id ? saved : x))); return saved; }
    catch (e) { setRemote(prev => prev.filter(x => x.id !== optimistic.id)); throw e; }
  }, []);
  /* Move guest attempts to a freshly signed-in account */
  const claimGuest = useCallback(async u => {
    const pending = guestStore.get(); if (!pending.length) return 0;
    let n = 0;
    for (const a of pending.slice().reverse()) { try { await backend.attempts.add({ ...a, user: u.id }); n++; } catch (e) { /* keep going */ } }
    guestStore.clear(); setGuest([]); await reload();
    return n;
  }, [reload]);
  const attempts = guest.length ? [...guest, ...remote] : remote;
  return { attempts, loading, addAttempt, reload, claimGuest, guestCount: guest.length };
}

/* ---------- Quizzes with admin edits (removed base questions + admin-added ones) applied ---------- */
export function useQuizzes() {
  const [edits, setEdits] = useState({ custom: {}, removed: [] });
  useEffect(() => { backend.questions.load().then(setEdits); }, []);
  const removed = new Set(edits.removed);
  const quizzes = QUIZZES.map(q => {
    const base = q.questions.filter(x => !removed.has(x.id));
    const custom = edits.custom[q.id] || [];
    const edited = base.length !== q.questions.length || custom.length > 0;
    return edited ? { ...q, questions: [...base, ...custom], edited } : q;
  });
  const addQuestion = useCallback(async (quizId, qq) => {
    const row = await backend.questions.add(quizId, qq);
    setEdits(e => ({ ...e, custom: { ...e.custom, [quizId]: [...(e.custom[quizId] || []), row] } }));
  }, []);
  const removeQuestion = useCallback(async (quizId, qid) => {
    await backend.questions.remove(quizId, qid);
    setEdits(e => qid.startsWith('custom-')
      ? { ...e, custom: { ...e.custom, [quizId]: (e.custom[quizId] || []).filter(x => x.id !== qid) } }
      : { ...e, removed: [...e.removed, qid] });
  }, []);
  const resetQuiz = useCallback(async quizId => {
    await backend.questions.reset(quizId);
    setEdits(e => { const c = { ...e.custom }; delete c[quizId]; return { custom: c, removed: e.removed.filter(id => !id.startsWith(quizId + '-')) }; });
  }, []);
  const byId = useCallback(id => quizzes.find(q => q.id === id), [quizzes]);
  return { quizzes, byId, addQuestion, removeQuestion, resetQuiz };
}

/* ---------- Duel: server owns the state, this keeps a synced countdown and pushes answers ----------
   `skew` is (server clock - this browser's clock), measured on every reply, so both players
   see the same seconds left even if their device clocks disagree.                              */
export function useDuel(user) {
  const [duel, setDuel] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [answeredBy, setAnsweredBy] = useState([]);   // who has answered the current question
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const skew = useRef(0);
  const ticking = useRef(null);                        // q_index we already asked the server to close

  const apply = useCallback(r => {
    if (r?.error) { setErr(r.error); return r; }
    if (r?.now) skew.current = r.now - Date.now();
    if (r?.duel) setDuel(prev => (prev && prev.q_index !== r.duel.q_index ? (setAnsweredBy([]), r.duel) : r.duel));
    return r;
  }, []);

  const run = useCallback(async fn => { setBusy(true); setErr(''); const r = apply(await fn()); setBusy(false); return r; }, [apply]);

  const create = useCallback((quizId, qIds, qAns, perQ) => run(() => backend.duels.create(quizId, qIds, qAns, perQ)), [run]);
  const join = useCallback(code => run(() => backend.duels.join(code)), [run]);
  const leave = useCallback(async () => { if (duel) await run(() => backend.duels.leave(duel.id)); }, [duel, run]);
  const answer = useCallback(async choice => {
    if (!duel) return;
    setAnsweredBy(a => (a.includes(user.id) ? a : [...a, user.id]));
    apply(await backend.duels.answer(duel.id, duel.q_index, choice));
  }, [duel, user?.id, apply]);
  const exit = useCallback(() => { setDuel(null); setAnsweredBy([]); setErr(''); }, []);

  /* realtime push + a slow poll so a dropped socket can never freeze a round */
  useEffect(() => {
    if (!duel?.id || duel.status === 'done' || duel.status === 'cancelled') return;
    const id = duel.id;
    const off = backend.duels.subscribe(id, {
      onDuel: row => { setDuel(prev => (prev && prev.q_index !== row.q_index ? (setAnsweredBy([]), row) : row)); },
      onAnswer: row => setAnsweredBy(a => (a.includes(row.user_id) ? a : [...a, row.user_id]))
    });
    const poll = setInterval(async () => { apply(await backend.duels.get(id)); }, 3000);
    return () => { off(); clearInterval(poll); };
  }, [duel?.id, duel?.status, apply]);

  /* the countdown itself: when it hits zero either player asks the server to close the question */
  useEffect(() => {
    if (duel?.status !== 'playing' || !duel.deadline) { setRemaining(0); return; }
    const end = Date.parse(duel.deadline);
    const tick = async () => {
      const left = Math.max(0, end - (Date.now() + skew.current));
      setRemaining(left);
      if (left === 0 && ticking.current !== duel.q_index) {
        ticking.current = duel.q_index;
        apply(await backend.duels.tick(duel.id));
      }
    };
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [duel?.id, duel?.status, duel?.deadline, duel?.q_index, apply]);

  return { duel, remaining, answeredBy, err, busy, create, join, answer, leave, exit, setErr };
}

export function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const t = useRef();
  const toast = useCallback(m => { setMsg(m); setShow(true); clearTimeout(t.current); t.current = setTimeout(() => setShow(false), 2600); }, []);
  return { msg, show, toast };
}

/* Animates a number from 0 to `to` after mount */
export function useCountUp(to, dur = 1400) {
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) { setV(to); return; }
    let raf; const t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return v;
}

/* Width that starts at 0 and grows to `w` so the CSS transition plays */
export function useGrow(w) {
  const [cur, setCur] = useState(0);
  useEffect(() => { const id = setTimeout(() => setCur(w), 80); return () => clearTimeout(id); }, [w]);
  return cur;
}

/* Fade/slide-in for .reveal elements below the fold */
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    if (reduced || !('IntersectionObserver' in window) || !rootRef.current) return;
    const els = [...rootRef.current.querySelectorAll('.reveal')].filter(el => el.getBoundingClientRect().top > innerHeight);
    els.forEach(el => el.classList.add('pre'));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* Which section is in view; also mirrors it into the URL hash */
export function useScrollSpy(enabled, sections) {
  const [active, setActive] = useState('#top');
  const lock = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const spy = () => {
      if (Date.now() < lock.current) return;
      const y = window.scrollY + innerHeight * 0.35; let cur = '#top';
      sections.forEach(h => { const el = document.querySelector(h); if (el && el.offsetTop - 72 <= y) cur = h; });
      if (innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = sections[sections.length - 1];
      setActive(cur);
      const hash = cur === '#top' ? '' : cur;
      if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
    };
    spy();
    window.addEventListener('scroll', spy, { passive: true });
    return () => window.removeEventListener('scroll', spy);
  }, [enabled, sections]);
  const jump = useCallback(href => {
    const el = document.querySelector(href);
    const y = !el || href === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 72;
    if (el) el.querySelectorAll('.reveal.pre').forEach(x => x.classList.remove('pre'));
    lock.current = Date.now() + 700; setActive(href);
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', href === '#top' ? location.pathname + location.search : href);
  }, []);
  return { active, setActive, jump };
}
