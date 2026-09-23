import { useEffect, useMemo, useRef } from 'react';
import { BADGES } from '../data.js';
import { CAT_GRADS, fmtLong } from '../utils.js';
import { BadgeGrid, Bar, EmptyState } from './ui.jsx';

/* Line chart of the last N attempts, drawn on canvas and redrawn on resize */
function ProgressChart({ list, byId }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const draw = () => {
      const box = c.parentElement.getBoundingClientRect(); const dpr = devicePixelRatio || 1;
      c.width = box.width * dpr; c.height = box.height * dpr; const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
      const W = box.width, H = box.height, padL = 34, padR = 12, padT = 14, padB = 30;
      const cs = getComputedStyle(document.documentElement); const line = cs.getPropertyValue('--line').trim(); const muted = cs.getPropertyValue('--muted').trim(); const ink = cs.getPropertyValue('--ink').trim();
      ctx.clearRect(0, 0, W, H); ctx.font = '600 11px DM Sans, system-ui'; ctx.fillStyle = muted; ctx.strokeStyle = line; ctx.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach(v => { const y = padT + (H - padT - padB) * (1 - v / 100); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v + '%', padL - 8, y + 4); });
      if (!list.length) return;
      const pts = list.map((a, i) => ({ x: padL + (W - padL - padR) * (list.length === 1 ? 0.5 : i / (list.length - 1)), y: padT + (H - padT - padB) * (1 - a.score / a.total), a }));
      const g = ctx.createLinearGradient(0, padT, 0, H - padB); g.addColorStop(0, 'rgba(79,70,229,.35)'); g.addColorStop(1, 'rgba(79,70,229,0)');
      ctx.beginPath(); ctx.moveTo(pts[0].x, H - padB); pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(pts[pts.length - 1].x, H - padB); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      const lg = ctx.createLinearGradient(padL, 0, W - padR, 0); lg.addColorStop(0, '#4F46E5'); lg.addColorStop(1, '#06B6D4');
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.strokeStyle = lg; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
      pts.forEach((p, i) => {
        const lastPt = i === pts.length - 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, lastPt ? 6 : 4, 0, Math.PI * 2); ctx.fillStyle = lastPt ? '#F97316' : '#4F46E5'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.font = '600 11px DM Sans, system-ui'; ctx.fillText(byId(p.a.quiz).icon, p.x, H - padB + 18);
        ctx.fillStyle = ink; ctx.font = '700 11px Sora, system-ui'; ctx.fillText(Math.round((p.a.score / p.a.total) * 100) + '%', p.x, p.y - 11);
      });
    };
    draw();
    const ro = new ResizeObserver(draw); ro.observe(c.parentElement);
    return () => ro.disconnect();
  }, [list, byId]);
  return <div className="chart-wrap"><canvas ref={ref} /></div>;
}

export default function Dashboard({ quizzes, byId, attempts, stats, me, user, onStart, onJoin }) {
  const subjects = useMemo(() => {
    const subs = {};
    attempts.forEach(a => { const q = byId(a.quiz); if (q) (subs[q.cat] = subs[q.cat] || []).push((a.score / a.total) * 100); });
    const rows = Object.entries(subs).map(([n, v]) => [n, Math.round(v.reduce((x, y) => x + y) / v.length)]).sort((a, b) => b[1] - a[1]);
    return { subs, rows };
  }, [attempts, byId]);
  const recent = attempts.slice(0, 6);
  const weak = subjects.rows.slice().reverse().map(r => quizzes.find(q => q.cat === r[0])).filter(Boolean);
  const unplayed = quizzes.filter(q => !subjects.subs[q.cat]);
  const reco = [...unplayed, ...weak].slice(0, 4);
  const unlocked = BADGES.filter(b => b.check(stats)).length;
  const kpis = [
    ['📝', attempts.length, 'Quizzes attempted', 'var(--grad-science)', ''], ['📈', `${Math.round(stats.avg)}%`, 'Average score', 'var(--grad-reason)', ''],
    ['🎯', `${Math.round(stats.accuracy)}%`, 'Accuracy', 'var(--grad-maths)', ''], ['🏆', `${Math.round(stats.best)}%`, 'Best score', 'var(--grad-eng)', '']
  ];

  return (
    <main>
      <div className="container dash">
        <div className="card dash-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.85 }}>{user?.role === 'admin' ? 'Admin · personal dashboard' : 'Student Dashboard'}</div>
            <h1>{user ? `Welcome back, ${me.name.split(' ')[0]}! 👋` : 'Your guest dashboard 👋'}</h1>
            <p>{attempts.length ? `You've completed ${attempts.length} quiz${attempts.length === 1 ? '' : 'zes'} with an average of ${Math.round(stats.avg)}%. Keep the streak alive.` : 'No quizzes yet — play your first one to start tracking progress.'}</p>
            {!user && <p style={{ marginTop: 10, fontSize: 13.5, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><span>Scores here stay in this browser and are not on the leaderboard.</span><button className="btn btn-white btn-sm" onClick={() => onJoin('signup')}>Sign up to join the leaderboard</button></p>}
          </div>
          <div className="streak"><span className="fire">🔥</span><div><span>{stats.streak} Day Streak</span><small>Best: {stats.bestStreak} day{stats.bestStreak === 1 ? '' : 's'}</small></div></div>
        </div>

        <div className="kpis">
          {kpis.map(k => <div key={k[2]} className="card kpi"><span className="ic" style={{ background: k[3] }}>{k[0]}</span><b className="tabular">{k[1]}</b><span>{k[2]}</span>{k[4] && <span className="delta">{k[4]}</span>}</div>)}
        </div>

        <div className="dash-grid">
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card panel">
              <h3>Progress chart <span>Last 8 quizzes · score %</span></h3>
              <ProgressChart list={attempts.slice(0, 8).reverse()} byId={byId} />
            </div>
            <div className="card panel">
              <h3>Recent quizzes <span>{attempts.length} total</span></h3>
              <div className="recent">
                {recent.length ? recent.map((a, i) => {
                  const q = byId(a.quiz); const p = Math.round((a.score / a.total) * 100); const d = new Date(a.date);
                  return (
                    <div key={i} className="recent-item">
                      <span className="ic" style={{ background: q.grad }}>{q.icon}</span>
                      <div className="info"><b>{q.title}</b><span>{d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {fmtLong(a.time)}</span></div>
                      <div className="sc" style={{ color: p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--ink)' : 'var(--bad)' }}>{a.score}/{a.total}<small>{p}%</small></div>
                    </div>
                  );
                }) : <EmptyState emoji="🎮" title="No quizzes yet" text="Your attempts will show up here." />}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <div className="card panel">
              <h3>Your Progress <span>Subject-wise</span></h3>
              <div className="subject-bars">
                {!subjects.rows.length && <EmptyState emoji="📚" title="Nothing to show yet" text="Subject scores appear after your first quiz." />}
                {subjects.rows.map(([n, p]) => <div key={n} className="row"><span>{n}</span><Bar value={p} gradient={CAT_GRADS[n] || 'var(--grad-brand)'} /><b>{p}%</b></div>)}
              </div>
            </div>
            <div className="card panel">
              <h3>Recommended for you <span>Based on weak areas</span></h3>
              <div className="reco">
                {reco.map(q => {
                  const v = subjects.subs[q.cat];
                  return (
                    <button key={q.id} className="reco-item" onClick={() => onStart(q.id)}>
                      <span className="ic" style={{ background: q.grad }}>{q.icon}</span>
                      <div className="info"><b>{q.title}</b><span>{v ? `Improve your ${Math.round(v.reduce((a, b) => a + b) / v.length)}% average` : 'Not attempted yet'} · {q.minutes} min</span></div>
                      <span style={{ color: 'var(--indigo)', fontWeight: 800, fontSize: 13 }}>Play →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="card panel">
          <h3>Achievement badges <span>{unlocked} of {BADGES.length} unlocked</span></h3>
          <BadgeGrid stats={stats} />
        </div>
      </div>
    </main>
  );
}
