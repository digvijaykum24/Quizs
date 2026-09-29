import { BADGES, byId as baseById } from './data.js';

export const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
export const fmtLong = s => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
export const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
export const LETTERS = ['A', 'B', 'C', 'D'];
export const SECTIONS = ['#top', '#quizzes', '#categories', '#leaderboard'];

export const CAT_GRADS = {
  Science: 'var(--grad-science)', Mathematics: 'var(--grad-maths)', 'GK Hindi': 'var(--grad-hindi)', English: 'var(--grad-eng)',
  Reasoning: 'var(--grad-reason)', Geography: 'var(--grad-geo)', 'Competitive Exams': 'var(--grad-exam)', 'General Knowledge': 'var(--grad-gk)'
};

/* Local, per-viewer persistence of attempts. Falls back silently when storage is unavailable. */
export const store = {
  get() { try { return JSON.parse(localStorage.getItem('qa_attempts') || '[]'); } catch (e) { return []; } },
  set(arr) { try { localStorage.setItem('qa_attempts', JSON.stringify(arr.slice(0, 60))); } catch (e) {} },
  badges() { try { return JSON.parse(localStorage.getItem('qa_badges') || '[]'); } catch (e) { return []; } },
  setBadges(b) { try { localStorage.setItem('qa_badges', JSON.stringify(b)); } catch (e) {} },
  read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
};

export const fmtDate = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const pctOf = a => Math.round((a.score / a.total) * 100);

/* Aggregates one user's attempts for the admin directory */
export function userSummary(attempts) {
  const n = attempts.length;
  const avg = n ? Math.round(attempts.reduce((s, a) => s + pctOf(a), 0) / n) : 0;
  const best = n ? Math.max(...attempts.map(pctOf)) : 0;
  const last = n ? attempts.map(a => a.date).sort().slice(-1)[0] : null;
  return { n, avg, best, last };
}

export function computeStats(at, byId = baseById) {
  const pcts = at.map(a => (a.score / a.total) * 100);
  const total = at.length;
  const avg = total ? pcts.reduce((x, y) => x + y, 0) / total : 0;
  const days = [...new Set(at.map(a => a.date.slice(0, 10)))].sort();
  // current streak: consecutive days ending today or yesterday
  let streak = 0; const now = new Date();
  for (let i = 0; i < 366; i++) {
    const k = new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10);
    if (days.includes(k)) streak++; else if (i > 0) break;
  }
  // longest streak ever
  let best = 0, run = 0, prev = null;
  days.forEach(d => { run = prev && (new Date(d) - new Date(prev)) === 864e5 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return {
    total, avg, streak, bestStreak: Math.max(best, streak),
    high80: pcts.filter(p => p >= 80).length,
    perfect: pcts.filter(p => p === 100).length,
    fast: at.filter(a => { const q = byId(a.quiz); return q && a.time < q.minutes * 30; }).length,
    best: total ? Math.max(...pcts) : 0,
    accuracy: total ? (at.reduce((s, a) => s + (a.attempted ? a.score / a.attempted : a.score / a.total), 0) / total) * 100 : 0
  };
}

export const unlockedIds = stats => BADGES.filter(b => b.check(stats)).map(b => b.id);

/* Points for one attempt: 10 per correct answer + 50 speed bonus when finished in under half the time */
export const pointsFor = (a, quiz) => a.score * 10 + (quiz && a.time < quiz.minutes * 30 ? 50 : 0);

const PERIOD_MS = { today: 864e5, week: 7 * 864e5, month: 30 * 864e5, all: Infinity };
/* Leaderboard rows for a period, built from real attempts by registered students */
export function leaderboardFor(attempts, users, period, byId) {
  const since = Date.now() - PERIOD_MS[period];
  const totals = {};
  attempts.forEach(a => {
    if (a.user === 'guest' || new Date(a.date).getTime() < since) return;
    const t = (totals[a.user] = totals[a.user] || { score: 0, quizzes: 0, correct: 0, total: 0 });
    t.score += a.points ?? pointsFor(a, byId(a.quiz)); t.quizzes += 1; t.correct += a.score; t.total += a.total;
  });
  return Object.entries(totals)
    .map(([id, t]) => { const u = users.find(x => x.id === id); return u && u.role === 'student' ? { ...t, id, accuracy: Math.round((t.correct / t.total) * 100), name: u.name, sub: u.sub, color: u.color } : null; })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.quizzes - a.quizzes);
}

export function shareResult(r) {
  return `I scored ${r.correct}/${r.n} (${r.pct}%) in ${r.quiz.title} on QuizArena! 🏆 Can you beat it?`;
}
