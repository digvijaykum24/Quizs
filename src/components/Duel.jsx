import { useEffect, useMemo, useState } from 'react';
import { backend } from '../backend/index.js';
import { useDuel } from '../hooks/index.js';
import { initials, LETTERS, reduced } from '../utils.js';
import { EmptyState } from './ui.jsx';

const QUESTIONS = 7;          // questions per duel
const PER_Q = 15;             // seconds per question

const pickQuestions = quiz => {
  const pool = [...quiz.questions];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, Math.min(QUESTIONS, pool.length));
};

function Player({ name, color, score, you, answered, waiting }) {
  return (
    <div className={`duel-player${you ? ' you' : ''}`}>
      <span className="avatar" style={{ background: color }}>{initials(name)}</span>
      <div className="dp-info">
        <b>{name}{you ? ' (you)' : ''}</b>
        <span>{waiting ? 'waiting to join…' : answered ? '✅ answered' : 'thinking…'}</span>
      </div>
      <b className="dp-score tabular">{score}</b>
    </div>
  );
}

/* ---------- Lobby: start a challenge, join by code, or take an open one ---------- */
function Lobby({ user, quizzes, byId, onCreate, onJoin, busy, err, onToast }) {
  const [quizId, setQuizId] = useState(quizzes[0]?.id || '');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [o, h] = await Promise.all([backend.duels.open(), backend.duels.history()]);
      if (alive) { setOpen(o); setHistory(h); }
    };
    load();
    const t = setInterval(load, 4000);       // the lobby is a slow poll; the duel itself is realtime
    return () => { alive = false; clearInterval(t); };
  }, []);

  const record = history.reduce((a, d) => {
    if (d.my_score > d.their_score) a.w++; else if (d.my_score < d.their_score) a.l++; else a.d++;
    return a;
  }, { w: 0, l: 0, d: 0 });

  const start = () => { const q = byId(quizId); if (!q) return; onCreate(q); };

  return (
    <div className="duel-lobby">
      <div className="card panel">
        <h3>⚔️ Challenge someone <span>{QUESTIONS} questions · {PER_Q}s each · fastest correct answer scores more</span></h3>
        <div className="field">
          <label htmlFor="duelQuiz">Subject</label>
          <select id="duelQuiz" value={quizId} onChange={e => setQuizId(e.target.value)}>
            {quizzes.filter(q => q.questions.length).map(q => <option key={q.id} value={q.id}>{q.icon} {q.title}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={start} disabled={busy}>{busy ? 'Creating…' : '⚔️ Create a challenge'}</button>
        <p className="auth-foot">You'll get a code to share. Whoever enters it first plays you live.</p>
      </div>

      <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
        <form className="card panel" onSubmit={e => { e.preventDefault(); onJoin(code); }}>
          <h3>🔑 Join with a code</h3>
          <div className="field"><label htmlFor="duelCode">Challenge code</label><input id="duelCode" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7RMTQ" autoComplete="off" maxLength={8} /></div>
          {err && <div className="form-err" role="alert">⚠️ {err}</div>}
          <button className="btn btn-orange" type="submit" disabled={busy || code.trim().length < 4}>Join duel</button>
        </form>

        <div className="card panel">
          <h3>🟢 Open challenges <span>{open.length ? `${open.length} waiting` : 'none right now'}</span></h3>
          {open.length ? (
            <div className="recent">
              {open.map(o => (
                <div key={o.id} className="recent-item">
                  <span className="avatar" style={{ background: o.host_color }}>{initials(o.host_name)}</span>
                  <div className="info"><b>{o.host_name}</b><span>{byId(o.quiz_id)?.title || o.quiz_id} · {o.questions} questions</span></div>
                  <button className="btn btn-primary btn-sm" onClick={() => onJoin(o.code)} disabled={busy}>Accept</button>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>Nobody is waiting. Create a challenge and share the code — it stays open for 30 minutes.</p>}
        </div>

        <div className="card panel">
          <h3>📜 Your duel record</h3>
          <div className="duel-record">
            <div><b>{record.w}</b><span>Won</span></div>
            <div><b>{record.l}</b><span>Lost</span></div>
            <div><b>{record.d}</b><span>Drawn</span></div>
          </div>
          {history.slice(0, 4).map(h => (
            <div key={h.id} className="duel-hist">
              <span className={`chip ${h.my_score > h.their_score ? 'easy' : h.my_score < h.their_score ? 'hard' : 'mixed'}`}>
                {h.my_score > h.their_score ? 'Won' : h.my_score < h.their_score ? 'Lost' : 'Draw'}
              </span>
              <span>vs {h.their_name || 'opponent'}</span>
              <b className="tabular">{h.my_score}–{h.their_score}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Waiting room: the host sits here until someone enters the code ---------- */
function WaitingRoom({ duel, onCancel, onToast }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(duel.code); onToast('Code copied — send it to your opponent'); }
    catch (e) { onToast(duel.code); }
  };
  return (
    <div className="card duel-wait">
      <div className="duel-orb" aria-hidden="true">⚔️</div>
      <h2>Waiting for an opponent…</h2>
      <p>Share this code. The round starts the moment they join — you'll both see the same question at the same time.</p>
      <div className="duel-code" onClick={copy} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && copy()}>{duel.code}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={copy}>📋 Copy code</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------- The live round ---------- */
function Round({ duel, quiz, user, opponent, remaining, answeredBy, onAnswer, onLeave }) {
  const [choice, setChoice] = useState(null);
  const isHost = duel.host_id === user.id;
  const q = quiz?.questions.find(x => x.id === duel.q_ids[duel.q_index]);
  const total = duel.q_ids.length;
  const secs = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / (duel.per_q_sec * 1000)) * 100));
  const iAnswered = answeredBy.includes(user.id) || choice !== null;
  const theyAnswered = opponent?.id ? answeredBy.includes(opponent.id) : false;

  useEffect(() => { setChoice(null); }, [duel.q_index]);

  const pick = i => { if (iAnswered || remaining <= 0) return; setChoice(i); onAnswer(i); };

  return (
    <div className="duel-round">
      <div className="duel-scores">
        <Player name={user.name} color={user.color} score={isHost ? duel.host_score : duel.guest_score} you answered={iAnswered} />
        <div className="duel-vs">
          <b>{duel.q_index + 1}<span>/{total}</span></b>
          <span>VS</span>
        </div>
        <Player name={opponent?.name || 'Opponent'} color={opponent?.color || '#64748B'} score={isHost ? duel.guest_score : duel.host_score} answered={theyAnswered} />
      </div>

      <div className={`duel-timer${secs <= 5 ? ' hot' : ''}`}>
        <i style={{ width: `${pct}%`, transition: reduced ? 'none' : 'width .2s linear' }} />
        <span>{secs}s</span>
      </div>

      <div className="card duel-q">
        {q ? (
          <>
            <div className={`qt${quiz.hindi ? ' hi' : ''}`}>{q.q}</div>
            <div className="duel-opts">
              {q.opts.map((o, i) => {
                const chosen = choice === i;
                const reveal = iAnswered && i === q.a;
                return (
                  <button key={i} className={`opt${chosen ? ' picked' : ''}${reveal ? ' right' : ''}${chosen && i !== q.a ? ' wrong' : ''}`}
                    onClick={() => pick(i)} disabled={iAnswered}>
                    <span className="letter">{LETTERS[i]}</span>{o}
                  </button>
                );
              })}
            </div>
          </>
        ) : <p style={{ color: 'var(--muted)' }}>This question was removed by an admin — it will be skipped.</p>}
        <div className="duel-status">
          {iAnswered
            ? theyAnswered ? '⚡ Both in — next question…' : '⏳ Waiting for your opponent…'
            : theyAnswered ? '🔥 They have answered — your turn!' : 'Pick an answer. Faster correct answers score more.'}
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onLeave}>Forfeit and leave</button>
    </div>
  );
}

/* ---------- Result ---------- */
function Outcome({ duel, user, opponent, onRematch, onExit }) {
  const isHost = duel.host_id === user.id;
  const mine = isHost ? duel.host_score : duel.guest_score;
  const theirs = isHost ? duel.guest_score : duel.host_score;
  const myCorrect = isHost ? duel.host_correct : duel.guest_correct;
  const won = mine > theirs, draw = mine === theirs;
  const bailed = duel.left_by && duel.left_by !== user.id;
  return (
    <div className="card duel-done">
      <div className="duel-orb" aria-hidden="true">{won ? '🏆' : draw ? '🤝' : '💪'}</div>
      <h2>{bailed ? 'Opponent left the duel' : won ? 'You win!' : draw ? "It's a draw!" : 'You lost this one'}</h2>
      <p>{won ? 'Sharper and faster. Nicely done.' : draw ? 'Perfectly matched — run it back?' : 'Close one. A rematch is one tap away.'}</p>
      <div className="duel-final">
        <div><span>{user.name.split(' ')[0]}</span><b className="tabular">{mine}</b></div>
        <span className="dash">–</span>
        <div><span>{opponent?.name?.split(' ')[0] || 'Opponent'}</span><b className="tabular">{theirs}</b></div>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>{myCorrect} of {duel.q_ids.length} correct · 10 points per correct answer plus a speed bonus</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={onRematch}>🔁 Rematch</button>
        <button className="btn btn-ghost" onClick={onExit}>Back to lobby</button>
      </div>
    </div>
  );
}

export default function Duel({ user, users, quizzes, byId, onNav, onToast }) {
  const { duel, remaining, answeredBy, err, busy, create, join, answer, leave, exit } = useDuel(user);
  const playable = useMemo(() => quizzes.filter(q => q.questions.length), [quizzes]);

  if (!backend.duels.supported) {
    return (
      <main><div className="container duel-page">
        <EmptyState emoji="⚔️" title="Duels need the live site" text="This preview runs on browser-local storage, so there is no server to sync two players. On the hosted QuizArena (Supabase) duels work in real time." />
      </div></main>
    );
  }
  if (!user) {
    return (
      <main><div className="container duel-page">
        <EmptyState emoji="⚔️" title="Duels are for signed-in students" text="A duel puts your name against someone else's in real time, so it needs an account. Guests can still play every quiz solo." />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => onNav('#login')}>Log in or sign up</button>
          <button className="btn btn-ghost" onClick={() => onNav('#quizzes')}>Play solo instead</button>
        </div>
      </div></main>
    );
  }

  const opponentId = duel && (duel.host_id === user.id ? duel.guest_id : duel.host_id);
  const opponent = users.find(u => u.id === opponentId);
  const quiz = duel ? byId(duel.quiz_id) : null;

  return (
    <main>
      <div className="container duel-page">
        <header className="duel-head">
          <h1>⚔️ Duel</h1>
          <p>Two students, the same questions, one live clock. Answer faster than your opponent to score more.</p>
        </header>
        {!duel && <Lobby user={user} quizzes={playable} byId={byId} busy={busy} err={err} onToast={onToast}
          onCreate={q => { const picked = pickQuestions(q); create(q.id, picked.map(x => x.id), picked.map(x => x.a), PER_Q); }}
          onJoin={code => join(code)} />}
        {duel?.status === 'waiting' && <WaitingRoom duel={duel} onCancel={() => { leave(); exit(); }} onToast={onToast} />}
        {duel?.status === 'playing' && <Round duel={duel} quiz={quiz} user={user} opponent={opponent} remaining={remaining}
          answeredBy={answeredBy} onAnswer={answer} onLeave={() => { leave(); }} />}
        {(duel?.status === 'done' || duel?.status === 'cancelled') && (duel.status === 'cancelled'
          ? <div className="card duel-done"><div className="duel-orb">🚪</div><h2>Challenge cancelled</h2><button className="btn btn-primary" onClick={exit}>Back to lobby</button></div>
          : <Outcome duel={duel} user={user} opponent={opponent} onExit={exit}
              onRematch={() => { const q = byId(duel.quiz_id); const picked = pickQuestions(q); exit(); create(q.id, picked.map(x => x.id), picked.map(x => x.a), PER_Q); }} />)}
      </div>
    </main>
  );
}
