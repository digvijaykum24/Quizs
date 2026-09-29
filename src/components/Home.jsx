import { useRef, useState } from 'react';
import { CATEGORIES } from '../data.js';
import { useReveal } from '../hooks/index.js';
import { initials, leaderboardFor } from '../utils.js';
import { BadgeGrid, Bar, EmptyState, Icon } from './ui.jsx';

/* ---------- Hero ---------- */
function Hero({ onPick, onNav, live }) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <div className="hero-pill"><span className="dot" /> {live.students ? `${live.students.toLocaleString('en-IN')} student${live.students === 1 ? '' : 's'} registered` : 'New arena — be the first on the leaderboard'}</div>
          <h1><span>Test Your Knowledge.</span><span>Challenge Yourself.</span><span className="hl">Win Your Score.</span></h1>
          <p className="lead">Play interactive quizzes, take mock tests, improve your knowledge and track your progress. Free to play — no sign-up needed.</p>
          <div className="hero-ctas">
            <button className="btn btn-white btn-lg" onClick={onPick}>▶ Start Quiz</button>
            <a className="btn btn-glass btn-lg" href="#quizzes" onClick={e => { e.preventDefault(); onNav('#quizzes'); }}>Explore Tests</a>
          </div>
          <div className="hero-stats">
            <div><b className="tabular">{live.questions.toLocaleString('en-IN')}</b><span>Questions</span></div>
            <div><b className="tabular">{live.subjects}</b><span>Subjects</span></div>
            <div><b className="tabular">{live.attempts.toLocaleString('en-IN')}</b><span>Tests attempted</span></div>
          </div>
        </div>
        <div className="illo" aria-hidden="true">
          <div className="float f1"><span className="em">🔥</span><div>7 Day Streak<small>Keep it going!</small></div></div>
          <div className="float f2"><span className="em">🎯</span><div>Perfect Score<small>Badge unlocked</small></div></div>
          <div className="float f3"><span className="em">⚡</span><div>+250 XP<small>Speed bonus</small></div></div>
          <div className="float f4"><span className="em">🏆</span><div>Rank #3<small>Weekly board</small></div></div>
          <div className="illo-card">
            <div className="illo-top"><span>Science Quiz · Q 5/20</span><span className="illo-timer">⏱ 12:42</span></div>
            <div className="illo-prog"><i /></div>
            <div className="illo-q">What is the chemical symbol for Oxygen?</div>
            <div className="illo-opts">
              <div className="illo-opt pick"><b>A</b> O <span className="tick"><Icon.Check /></span></div>
              <div className="illo-opt"><b>B</b> Ox</div>
              <div className="illo-opt"><b>C</b> Og</div>
              <div className="illo-opt"><b>D</b> Om</div>
            </div>
            <div className="illo-foot"><span>Score <b className="score">840</b></span><span>Accuracy 92%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Quiz card ---------- */
export function QuizCard({ quiz: q, featured, attempts, plays = 0, onStart }) {
  const done = attempts.filter(a => a.quiz === q.id);
  const best = done.length ? Math.max(...done.map(a => Math.round((a.score / a.total) * 100))) : 0;
  return (
    <article className={`card qcard${featured ? ' featured' : ''}`}>
      <div className="qcard-head" style={{ background: q.grad }}>
        <span className="qcard-icon">{q.icon}</span><div className="cat">{q.cat}</div><h3>{q.title}</h3>
      </div>
      <div className="qcard-body">
        <div className="qcard-meta">
          <span className="chip"><Icon.List />{q.questions.length} Questions</span>
          <span className="chip"><Icon.Clock />{q.minutes} Minutes</span>
          <span className={`chip ${q.diffClass}`}>{q.difficulty}</span>
          {q.hindi && <span className="chip lang">हिंदी</span>}
        </div>
        <div className="qcard-prog">
          <div className="row"><span>{done.length ? 'Your best score' : 'Not attempted yet'}</span><span className="tabular">{best}%</span></div>
          <Bar value={best} />
        </div>
        <div className="qcard-foot"><span className="plays">🎮 {plays ? `${plays.toLocaleString('en-IN')} play${plays === 1 ? '' : 's'}` : 'No plays yet'}</span><button className="btn btn-primary" onClick={() => onStart(q.id)}>▶ {q.cta}</button></div>
      </div>
    </article>
  );
}

function Featured({ quizzes, attempts, allAttempts, onStart }) {
  const plays = id => allAttempts.filter(a => a.quiz === id).length;
  return (
    <section className="section" id="quizzes">
      <div className="container">
        <div className="section-head center reveal">
          <div className="eyebrow">Featured Quizzes</div>
          <h2>Choose Your Challenge</h2>
          <p>Pick a subject, beat the clock and climb the leaderboard. Every test gives instant feedback.</p>
        </div>
        <div className="grid grid-3">{quizzes.filter(q => q.featured).map(q => <QuizCard key={q.id} quiz={q} featured attempts={attempts} plays={plays(q.id)} onStart={onStart} />)}</div>
        <div className="section-head center reveal" style={{ marginTop: 56 }}><h2 style={{ fontSize: 24 }}>More quizzes &amp; mock tests</h2></div>
        <div className="grid grid-4">{quizzes.filter(q => !q.featured).map(q => <QuizCard key={q.id} quiz={q} attempts={attempts} plays={plays(q.id)} onStart={onStart} />)}</div>
      </div>
    </section>
  );
}

/* ---------- Categories ---------- */
function Categories({ quizzes, onExplore }) {
  const countFor = c => quizzes.filter(q => q.cat === c.name).length;
  return (
    <section className="section" id="categories" style={{ background: 'var(--surface)', borderBlock: '1px solid var(--line)' }}>
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">Categories</div>
          <h2>Explore every subject</h2>
          <p>From school syllabus to SSC, Banking and Railway exams — all in one place.</p>
        </div>
        <div className="grid grid-4" style={{ gap: 16 }}>
          {CATEGORIES.map(c => (
            <article key={c.id} className="card cat-card">
              <span className="ic" style={{ background: c.grad }}>{c.icon}</span>
              <div><h3>{c.name}</h3><div className="count">{countFor(c) ? `${countFor(c)} quiz${countFor(c) === 1 ? '' : 'zes'}` : 'Coming soon'}</div></div>
              <p>{c.desc}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => onExplore(c)}>Explore <Icon.Arrow /></button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Leaderboard ---------- */
const LB_TITLES = { today: "Today's Leaderboard", week: 'Weekly Leaderboard', month: 'Monthly Leaderboard', all: 'All-Time Leaderboard' };
const Avatar = ({ name, color, style }) => <span className="avatar" style={{ background: color, ...style }}>{initials(name)}</span>;

const EMPTY_COPY = {
  today: ['No scores yet today', 'The board resets at midnight. Play a quiz now and be the first name on it.'],
  week: ['The weekly board is empty', 'Scores from the last 7 days appear here. Log in, finish a quiz and claim rank #1.'],
  month: ['No scores this month yet', 'Finish a quiz while logged in to open the monthly board.'],
  all: ['Nobody on the board yet', 'Be the first student in the arena — log in and complete any quiz.']
};

function Leaderboard({ onPick, me, user, allAttempts, loading, users, byId, onLogin, onJoin, guestCount }) {
  const [f, setF] = useState('week');
  const rows = leaderboardFor(allAttempts, users, f, byId);
  const top = rows.slice(0, 10);
  const myIdx = rows.findIndex(r => r.id === me.id);
  const mine = myIdx > -1 ? rows[myIdx] : null;
  const toTop3 = rows.length >= 3 && mine && myIdx > 2 ? rows[2].score - mine.score + 1 : 0;
  const [a, b, c] = rows;
  const Pod = ({ r, cls, place }) => <div className={`p ${cls}`}><Avatar name={r.name} color={r.color} /><b>{r.name.split(' ')[0]}</b><div className="bar-p">{place}</div><small>{r.score.toLocaleString('en-IN')} pts</small></div>;
  return (
    <section className="section" id="leaderboard">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">Competition</div>
          <h2>🏆 Weekly Leaderboard</h2>
          <p>Anyone can play. Students with an account appear here — 10 points per correct answer, +50 for finishing in under half the time. Sign up to see your name on the board.</p>
        </div>
        <div className="lb-wrap">
          <div className="card">
            <div className="lb-head">
              <h3>🏆 {LB_TITLES[f]}</h3>
              <div className="filters" role="tablist">
                {Object.entries({ today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={f === k} className={f === k ? 'active' : ''} onClick={() => setF(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="lb-table">
              {loading ? (
                <div className="empty"><div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} /><p>Loading scores…</p></div>
              ) : rows.length ? (
                <>
                  {top.map((r, i) => (
                    <div key={r.id} className={`lb-row${r.id === me.id ? ' me' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                      <span className={`rank r${i + 1}`}>{i < 3 ? '' : i + 1}</span>
                      <div className="student"><Avatar name={r.name} color={r.color} /><div style={{ minWidth: 0 }}><b>{r.name}{r.id === me.id ? ' (you)' : ''}</b><span>{r.quizzes} quiz{r.quizzes === 1 ? '' : 'zes'} · {r.accuracy}% accuracy</span></div></div>
                      <div className="score tabular">{r.score.toLocaleString('en-IN')}<small>points</small></div>
                    </div>
                  ))}
                  {mine && myIdx >= 10 && (
                    <div className="lb-row me">
                      <span className="rank">{myIdx + 1}</span>
                      <div className="student"><span className="avatar" style={{ background: 'var(--grad-brand)' }}>{initials(me.name)}</span><div><b>You ({me.name})</b><span>{mine.quizzes} quiz{mine.quizzes === 1 ? '' : 'zes'} · {mine.accuracy}% accuracy</span></div></div>
                      <div className="score tabular">{mine.score.toLocaleString('en-IN')}<small>points</small></div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState emoji={f === 'today' ? '🌅' : '🏟️'} title={EMPTY_COPY[f][0]} text={EMPTY_COPY[f][1]}>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {!user && <button className="btn btn-ghost" onClick={() => onJoin('signup')}>Sign up free</button>}
                    <button className="btn btn-primary" onClick={onPick}>▶ Start Quiz</button>
                  </div>
                </EmptyState>
              )}
            </div>
          </div>
          <div className="lb-side">
            <div className="podium">
              {rows.length >= 3 ? (
                <><h4>🥇 Top 3 · {LB_TITLES[f].replace(' Leaderboard', '')}</h4><div className="stand"><Pod r={b} cls="second" place="2" /><Pod r={a} cls="first" place="1" /><Pod r={c} cls="third" place="3" /></div></>
              ) : (
                <><h4>🥇 Top 3 · {LB_TITLES[f].replace(' Leaderboard', '')}</h4><p style={{ opacity: 0.85, fontSize: 14 }}>{rows.length ? `${3 - rows.length} more student${3 - rows.length === 1 ? '' : 's'} needed to fill the podium.` : 'The podium is empty — three finishers will stand here.'}</p></>
              )}
            </div>
            {user?.role === 'student' ? (
              mine
                ? <div className="card mini-stat"><span className="ic" style={{ background: '#EEF2FF' }}>📍</span><div><b>Rank #{myIdx + 1}</b><span>Your position · {mine.score.toLocaleString('en-IN')} pts from {mine.quizzes} quiz{mine.quizzes === 1 ? '' : 'zes'}</span></div></div>
                : <div className="card mini-stat"><span className="ic" style={{ background: '#EEF2FF' }}>📍</span><div><b>Not ranked yet</b><span>Finish a quiz to enter this board</span></div></div>
            ) : (
              user
                ? <div className="card mini-stat"><span className="ic" style={{ background: '#EEF2FF' }}>🛡️</span><div><b>Admins are not ranked</b><span>Student accounts compete on the board</span></div></div>
                : <button className="card mini-stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onJoin('signup')}><span className="ic" style={{ background: '#EEF2FF' }}>🔑</span><div><b>{guestCount ? `${guestCount} guest score${guestCount === 1 ? '' : 's'} waiting` : 'Want your name here?'}</b><span>{guestCount ? 'Sign up free to add them to the board →' : 'Play free; sign up only if you want to be ranked →'}</span></div></button>
            )}
            {toTop3 > 0 && <div className="card mini-stat"><span className="ic" style={{ background: '#FFF7ED' }}>⬆️</span><div><b>+{toTop3.toLocaleString('en-IN')} pts</b><span>needed to reach the top 3</span></div></div>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
/* ---------- Home ---------- */
export default function Home({ quizzes, byId, attempts, allAttempts, attemptsLoading, users, stats, me, user, guestCount, onStart, onPick, onNav, onExplore, onLogin, onJoin }) {
  const live = { students: users.filter(u => u.role === 'student').length, questions: quizzes.reduce((s, q) => s + q.questions.length, 0), subjects: CATEGORIES.length, attempts: allAttempts.length };
  const ref = useRef(null);
  useReveal(ref, []);
  return (
    <main ref={ref}>
      <div id="top" />
      <Hero onPick={onPick} onNav={onNav} live={live} />
      <Featured quizzes={quizzes} attempts={attempts} allAttempts={allAttempts} onStart={onStart} />
      <Categories quizzes={quizzes} onExplore={onExplore} />
      <Leaderboard onPick={onPick} me={me} user={user} allAttempts={allAttempts} loading={attemptsLoading} users={users} byId={byId} onLogin={onLogin} onJoin={onJoin} guestCount={guestCount} />
      <section className="section">
        <div className="container">
          <div className="section-head center reveal"><div className="eyebrow">Achievements</div><h2>Unlock badges as you play</h2><p>Every quiz, streak and perfect score earns you something. Collect them all.</p></div>
          <BadgeGrid stats={stats} />
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card reveal" style={{ background: 'var(--grad-brand)', color: '#fff', border: 0, padding: '40px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <h2 style={{ fontSize: 'clamp(24px,3.6vw,34px)', fontWeight: 800 }}>Ready to beat your best score?</h2>
            <p style={{ opacity: 0.9, margin: '10px auto 22px', maxWidth: 520 }}>Jump into a 15-minute Science quiz or a full 30-question Maths mock. Your progress is saved automatically.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-white btn-lg" onClick={() => onStart('science')}>🔬 Start Science Quiz</button>
              <button className="btn btn-glass btn-lg" onClick={() => onStart('maths')}>➗ Start Maths Mock</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
