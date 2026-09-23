import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/index.js';
import { fmtLong, LETTERS, reduced, shareResult } from '../utils.js';

const CIRC = 339.3;

function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced) return;
    const c = ref.current, ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = ['#4F46E5', '#7C3AED', '#06B6D4', '#F97316', '#22C55E', '#F43F5E', '#FDE68A'];
    const P = Array.from({ length: 160 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)] }));
    let raf; const t0 = performance.now();
    const frame = t => {
      const el = (t - t0) / 1000; ctx.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach(p => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, el - 2.2)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (el < 3.4) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas id="confetti" ref={ref} />;
}

function Ring({ pct }) {
  const [off, setOff] = useState(CIRC);
  useEffect(() => { const id = requestAnimationFrame(() => setOff(CIRC * (1 - pct / 100))); return () => cancelAnimationFrame(id); }, [pct]);
  const shown = useCountUp(pct);
  return (
    <div className="ring">
      <svg viewBox="0 0 120 120"><circle className="track" cx="60" cy="60" r="54" /><circle className="fill" cx="60" cy="60" r="54" style={{ strokeDashoffset: off }} /></svg>
      <div className="center"><b>{shown}%</b><span>Percentage</span></div>
    </div>
  );
}

export default function Result({ result: r, user, onRetry, onNext, onNav, onToast, onJoin }) {
  const [review, setReview] = useState(false);
  const reviewRef = useRef(null);
  const score = useCountUp(r.correct);
  const high = r.pct >= 80;
  useEffect(() => { if (review && reviewRef.current) reviewRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, [review]);

  const msg = r.pct === 100 ? 'Perfect score! Absolutely flawless. 🎯' : high ? 'Excellent work — you are in the top tier for this quiz! 🔥' : r.pct >= 60 ? 'Good job! A little revision and you will ace it. 💪' : r.pct >= 40 ? 'Decent attempt. Review the answers and try again. 📖' : "Don't worry — every expert started here. Review and retry. 🌱";
  const wrongIdx = r.answers.map((a, i) => (a !== null && a !== r.quiz.questions[i].a ? i + 1 : null)).filter(Boolean);
  const tip = r.wrong ? `You missed question${r.wrong > 1 ? 's' : ''} ${wrongIdx.slice(0, 5).join(', ')}${wrongIdx.length > 5 ? '…' : ''}. Open "View Answers" to revise them before your next attempt.`
    : r.skipped ? `You skipped ${r.skipped} question${r.skipped > 1 ? 's' : ''}. Attempting every question could push you above ${Math.min(100, r.pct + r.skipped * Math.round(100 / r.n))}%.`
    : 'No wrong answers — try a harder quiz or beat your time next round.';
  const stats = [
    ['✅', r.correct, 'Correct answers', '#ECFDF3'], ['❌', r.wrong, 'Wrong answers', '#FEF2F2'], ['⏭️', r.skipped, 'Skipped', '#FFF7ED'],
    ['⏱️', fmtLong(r.time), 'Time taken', '#EEF2FF'], ['🎯', `${r.acc}%`, 'Accuracy', '#ECFEFF'], ['⚡', r.correct * 10 + (r.time < r.quiz.minutes * 30 ? 50 : 0), 'Points earned', '#FDF4FF']
  ];

  const share = async () => {
    const text = shareResult(r);
    try { if (navigator.share) { await navigator.share({ title: 'My QuizArena result', text }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(text); onToast('Result copied — paste it anywhere to share'); } catch (e) { onToast(text); }
  };

  return (
    <main>
      {high && <Confetti />}
      <div className="container result-wrap">
        <div className="result-hero">
          <div className={`trophy${high ? ' big' : ''}`}>{r.pct >= 80 ? '🏆' : r.pct >= 50 ? '🥈' : '📘'}</div>
          <h1>{r.timedOut ? "Time's Up!" : 'Quiz Completed!'}</h1>
          <p className="msg">{msg}</p>
        </div>
        <div className="result-main">
          <div className="card score-card">
            <div className="lbl">Your Score</div>
            <Ring pct={r.pct} />
            <div className="score-big"><span>{score}</span> <small>/ {r.n}</small></div>
            <div style={{ fontSize: 13.5, opacity: 0.85 }}>{r.quiz.icon} {r.quiz.title} · {r.n} questions</div>
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <div className="stats-grid">
              {stats.map(s => <div key={s[2]} className="card stat"><span className="ic" style={{ background: s[3] }}>{s[0]}</span><b className="tabular">{s[1]}</b><span>{s[2]}</span></div>)}
            </div>
            <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 26 }}>💡</span>
              <div><b style={{ fontFamily: 'var(--font-display)' }}>Performance insight</b><div style={{ fontSize: 14, color: 'var(--muted)' }}>{tip}</div></div>
            </div>
          </div>
        </div>
        {!user && (
          <div className="card join-card">
            <div className="join-art" aria-hidden="true">🏆</div>
            <div className="join-text">
              <b>Want your name on the leaderboard?</b>
              <span>This score ({r.correct * 10 + (r.time < r.quiz.minutes * 30 ? 50 : 0)} pts) is saved in this browser only. Create a free account to add it to your profile, compete with other students and keep your streaks across devices.</span>
            </div>
            <div className="join-actions">
              <button className="btn btn-primary" onClick={() => onJoin('signup')}>Sign up free</button>
              <button className="btn btn-ghost" onClick={() => onJoin('login')}>Log in</button>
            </div>
          </div>
        )}
        <div className="result-actions">
          <button className="btn btn-primary btn-lg" onClick={onRetry}>🔁 Try Again</button>
          <button className="btn btn-orange btn-lg" onClick={onNext}>➡️ Next Quiz</button>
          <button className="btn btn-ghost btn-lg" onClick={() => setReview(v => !v)}>{review ? '🙈 Hide Answers' : '📋 View Answers'}</button>
          <button className="btn btn-ghost btn-lg" onClick={share}>🔗 Share Result</button>
        </div>
        {review && (
          <div className="review" ref={reviewRef}>
            {r.quiz.questions.map((qq, i) => {
              const a = r.answers[i]; const st = a === null ? 'skip' : a === qq.a ? 'ok' : 'bad';
              return (
                <div key={i} className={`card review-item ${st}`}>
                  <div className="qn"><span>Question {i + 1}</span><span>{st === 'ok' ? '✅ Correct' : st === 'bad' ? '❌ Wrong' : '⏭️ Skipped'}</span></div>
                  <div className={`qt${r.quiz.hindi ? ' hi' : ''}`}>{qq.q}</div>
                  <div className="ans">
                    {a === null ? <span className="sk">Not answered</span> : <span className={`you${st === 'ok' ? ' ok' : ''}`}>Your answer: {LETTERS[a]}. {qq.opts[a]}</span>}
                    {st !== 'ok' && <span className="cor">Correct: {LETTERS[qq.a]}. {qq.opts[qq.a]}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 28 }}><a className="btn btn-ghost" href="#dashboard" onClick={e => { e.preventDefault(); onNav('#dashboard'); }}>📊 Go to Dashboard</a></div>
      </div>
    </main>
  );
}
