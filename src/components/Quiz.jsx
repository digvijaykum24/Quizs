import { useCallback, useEffect, useRef, useState } from 'react';
import { fmt, LETTERS, reduced } from '../utils.js';
import { ConfirmModal, Icon } from './ui.jsx';

/* One answer option — handles hover/selected/correct/wrong states via classes */
function Option({ i, text, hindi, locked, selected, correctIdx, picked, onPick }) {
  let cls = 'opt';
  if (selected) cls += ' selected';
  if (locked) { cls += ' locked'; if (i === correctIdx) cls += ' correct'; else if (i === picked) cls += ' wrong'; }
  return (
    <button className={cls} disabled={locked} onClick={() => onPick(i)}>
      <span className="k">{LETTERS[i]}</span>
      <span className={`t${hindi ? ' hi' : ''}`}>{text}</span>
      <span className="st">{i === correctIdx ? <Icon.Check /> : <Icon.Cross />}</span>
    </button>
  );
}

export default function Quiz({ quiz, onExit, onFinish }) {
  const n = quiz.questions.length;
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(() => Array(n).fill(null));
  const [visited, setVisited] = useState(() => { const v = Array(n).fill(false); v[0] = true; return v; });
  const [pending, setPending] = useState(null); // option tapped, before reveal
  const [timeLeft, setTimeLeft] = useState(quiz.minutes * 60);
  const [leaving, setLeaving] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'exit' | 'submit'
  const started = useRef(Date.now());
  const answersRef = useRef(answers); answersRef.current = answers;

  const qq = quiz.questions[idx];
  const picked = answers[idx];
  const locked = picked !== null;
  const last = idx === n - 1;
  const answered = answers.filter(a => a !== null).length;
  const warn = timeLeft <= 60;

  const finish = useCallback((timedOut) => {
    const ans = answersRef.current;
    const correct = ans.filter((a, i) => a === quiz.questions[i].a).length;
    const skipped = ans.filter(a => a === null).length;
    const wrong = n - correct - skipped;
    const time = Math.min(quiz.minutes * 60, Math.round((Date.now() - started.current) / 1000));
    const attempted = n - skipped;
    onFinish({ quiz, answers: [...ans], correct, wrong, skipped, time, n, attempted, pct: Math.round((correct / n) * 100), acc: attempted ? Math.round((correct / attempted) * 100) : 0, timedOut });
  }, [quiz, n, onFinish]);

  // loading state, then start the timer
  useEffect(() => {
    const t = setTimeout(() => { setLoading(false); started.current = Date.now(); }, reduced ? 200 : 1100);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [loading]);
  useEffect(() => { if (timeLeft <= 0) finish(true); }, [timeLeft, finish]);

  const go = useCallback(next => {
    if (next < 0 || next >= n) return;
    const move = () => { setIdx(next); setVisited(v => { if (v[next]) return v; const c = [...v]; c[next] = true; return c; }); setLeaving(false); };
    if (reduced) move(); else { setLeaving(true); setTimeout(move, 180); }
  }, [n]);

  const pick = i => {
    if (locked || pending !== null) return;
    setPending(i);
    setTimeout(() => { setAnswers(a => { const c = [...a]; c[idx] = i; return c; }); setPending(null); }, reduced ? 0 : 220);
  };
  const next = () => (last ? finish(false) : go(idx + 1));
  const submit = () => { setNavOpen(false); if (n - answered === 0) finish(false); else setConfirm('submit'); };

  // keyboard: A–D pick, arrows move, Enter next
  useEffect(() => {
    const k = e => {
      if (confirm || loading) return;
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i > -1 && i < qq.opts.length) pick(i);
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  });

  const diff = quiz.difficulty.split(' / ')[Math.min(2, Math.floor((idx / n) * 3))] || quiz.difficulty;

  return (
    <div id="view-quiz">
      {loading && (
        <div className="q-loading">
          <div className="box">
            <div className="spinner" />
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Preparing {quiz.title}…</b>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Loading questions and starting the timer</span>
            <div className="skeleton"><i /><i /><i /><i /></div>
          </div>
        </div>
      )}
      <header className="q-header">
        <div className="q-header-inner">
          <div className="q-title"><b>{quiz.title}</b><span>Question {idx + 1} of {n}</span></div>
          <div className={`timer${warn ? ' warn' : ''}`}><Icon.Timer /><span>{fmt(Math.max(0, timeLeft))}</span></div>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm('exit')}>✕ <span className="exit-text">Exit Quiz</span></button>
        </div>
        <div className="q-progress"><i style={{ width: `${((idx + 1) / n) * 100}%` }} /></div>
        {warn && <div className="warn-banner">⚠️ Less than a minute left — submit your answers!</div>}
      </header>

      <div className="q-body">
        <div className="q-layout">
          <div>
            <div key={idx} className={`card q-card${leaving ? ' leaving' : ''}`}>
              <div className="q-meta"><span className="qnum">Question {idx + 1} of {n}</span><span className={`chip ${quiz.diffClass}`}>{diff}</span><span className="chip">+10 pts</span></div>
              <div className={`q-text${quiz.hindi ? ' hi' : ''}`}>{qq.q}</div>
              <div className="opts" role="group" aria-label="Answer options">
                {qq.opts.map((o, i) => <Option key={i} i={i} text={o} hindi={quiz.hindi} locked={locked} selected={pending === i} correctIdx={qq.a} picked={picked} onPick={pick} />)}
              </div>
              {locked && (picked === qq.a
                ? <div className="feedback ok">🎉 Correct! +10 points</div>
                : <div className="feedback bad">❌ Not quite. Correct answer: <b>{LETTERS[qq.a]}. {qq.opts[qq.a]}</b></div>)}
            </div>
            <div className="q-actions">
              <button className="btn btn-ghost" disabled={idx === 0} onClick={() => go(idx - 1)}>← Previous</button>
              <button className="btn btn-ghost qnav-toggle" onClick={() => setNavOpen(true)}>⋮⋮ Questions</button>
              <div className="right">
                <button className={`btn ${last ? 'btn-orange' : 'btn-primary'}`} onClick={next}>{last ? 'Finish Quiz ✓' : locked ? 'Next Question →' : 'Skip →'}</button>
              </div>
            </div>
          </div>

          <div className={`qnav-backdrop${navOpen ? ' open' : ''}`} onClick={() => setNavOpen(false)} />
          <aside className={`card qnav${navOpen ? ' open' : ''}`}>
            <h4>Question Navigator <span>{answered} / {n} answered</span></h4>
            <div className="qnav-grid">
              {quiz.questions.map((_, i) => {
                let c = ''; if (answers[i] !== null) c = 'done'; else if (visited[i] && i !== idx) c = 'skip'; if (i === idx) c += ' cur';
                return <button key={i} className={c.trim()} aria-label={`Question ${i + 1}`} onClick={() => { setNavOpen(false); go(i); }}>{i + 1}</button>;
              })}
            </div>
            <div className="qnav-legend"><span><i style={{ background: 'var(--indigo)' }} />Answered</span><span><i style={{ background: 'var(--amber)' }} />Skipped</span><span><i style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)' }} />Not visited</span></div>
            <button className="btn btn-orange btn-block" onClick={submit}>Submit Quiz</button>
          </aside>
        </div>
      </div>

      {confirm === 'exit' && <ConfirmModal emoji="🚪" title="Exit this quiz?" text="Your answers so far will be lost and the attempt won't be saved." cancel="Keep playing" ok="Exit quiz" onOk={onExit} onClose={() => setConfirm(null)} />}
      {confirm === 'submit' && <ConfirmModal emoji="📝" title={`Submit with ${n - answered} unanswered?`} text="Unanswered questions will be counted as skipped." cancel="Go back" ok="Submit anyway" onOk={() => { setConfirm(null); finish(false); }} onClose={() => setConfirm(null)} />}
    </div>
  );
}
