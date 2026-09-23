import { useEffect, useMemo, useState } from 'react';
import { fmtDate, fmtLong, initials, LETTERS, pctOf, userSummary } from '../utils.js';
import { ConfirmModal, EmptyState, Modal, ModalHead } from './ui.jsx';
import { backend } from '../backend/index.js';

const TABS = [['overview', '📊 Overview'], ['questions', '📝 Questions'], ['users', '👥 Users'], ['settings', '⚙️ Settings']];

/* ---------- Overview ---------- */
function Overview({ users, attempts, quizzes, byId }) {
  const today = new Date().toISOString().slice(0, 10);
  const students = users.filter(u => u.role === 'student');
  const qCount = quizzes.reduce((s, q) => s + q.questions.length, 0);
  const byQuiz = quizzes.map(q => ({ q, n: attempts.filter(a => a.quiz === q.id).length })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...byQuiz.map(x => x.n));
  const recent = attempts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const userOf = id => users.find(u => u.id === id);
  const kpis = [
    ['👥', students.length, 'Registered students', 'var(--grad-science)'], ['📝', attempts.length, 'Total attempts', 'var(--grad-reason)'],
    ['❓', qCount, `Questions across ${quizzes.length} quizzes`, 'var(--grad-maths)'], ['⚡', attempts.filter(a => a.date.slice(0, 10) === today).length, 'Attempts today', 'var(--grad-eng)']
  ];
  return (
    <>
      <div className="kpis">{kpis.map(k => <div key={k[2]} className="card kpi"><span className="ic" style={{ background: k[3] }}>{k[0]}</span><b className="tabular">{k[1]}</b><span>{k[2]}</span></div>)}</div>
      <div className="dash-grid">
        <div className="card panel">
          <h3>Recent activity <span>Latest attempts by all students</span></h3>
          <div className="recent">
            {!recent.length && <EmptyState emoji="📭" title="No attempts yet" text="Student activity will appear here as soon as someone finishes a quiz." />}
            {recent.map((a, i) => { const q = byId(a.quiz); const u = userOf(a.user); if (!q) return null; const p = pctOf(a);
              return (
                <div key={i} className="recent-item">
                  <span className="avatar" style={{ background: u?.color || '#64748B' }}>{initials(u?.name || 'Guest')}</span>
                  <div className="info"><b>{u?.name || 'Guest'} · {q.icon} {q.title}</b><span>{fmtDate(a.date)} · {fmtLong(a.time)}</span></div>
                  <div className="sc" style={{ color: p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--ink)' : 'var(--bad)' }}>{a.score}/{a.total}<small>{p}%</small></div>
                </div>
              ); })}
          </div>
        </div>
        <div className="card panel">
          <h3>Popular quizzes <span>Attempts per quiz</span></h3>
          <div className="subject-bars">
            {byQuiz.map(({ q, n }) => <div key={q.id} className="row"><span>{q.icon} {q.cat}</span><div className="bar"><i style={{ width: `${(n / max) * 100}%`, background: q.grad }} /></div><b>{n}</b></div>)}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Questions: add / remove per quiz ---------- */
const EMPTY_FORM = { q: '', opts: ['', '', '', ''], a: 0 };
function QuestionForm({ quiz, onAdd, onToast }) {
  const [f, setF] = useState(EMPTY_FORM);
  const [err, setErr] = useState('');
  const setOpt = i => e => setF(x => { const o = [...x.opts]; o[i] = e.target.value; return { ...x, opts: o }; });
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (f.q.trim().length < 5) return setErr('Write the full question text.');
    if (f.opts.some(o => !o.trim())) return setErr('Fill in all four options.');
    if (new Set(f.opts.map(o => o.trim().toLowerCase())).size < 4) return setErr('Options must be different from each other.');
    setBusy(true);
    try { await onAdd(quiz.id, { q: f.q.trim(), opts: f.opts.map(o => o.trim()), a: f.a }); setF(EMPTY_FORM); setErr(''); onToast(`Question added to ${quiz.title}`); }
    catch (ex) { setErr(ex.message || "Couldn't save the question."); }
    setBusy(false);
  };
  return (
    <form className="card panel" onSubmit={submit} noValidate>
      <h3>➕ Add a question <span>to {quiz.title}</span></h3>
      <div className="field"><label htmlFor="nqText">Question</label><textarea id="nqText" rows="2" value={f.q} onChange={e => { setF(x => ({ ...x, q: e.target.value })); setErr(''); }} placeholder={quiz.hindi ? 'प्रश्न यहाँ लिखें…' : 'Type the question…'} /></div>
      <div className="opt-form">
        {f.opts.map((o, i) => (
          <label key={i} className={`opt-input${f.a === i ? ' is-answer' : ''}`}>
            <input type="radio" name="nqAnswer" checked={f.a === i} onChange={() => setF(x => ({ ...x, a: i }))} aria-label={`Option ${LETTERS[i]} is the correct answer`} />
            <span className="k">{LETTERS[i]}</span>
            <input id={`nqOpt${i}`} value={o} onChange={setOpt(i)} placeholder={`Option ${LETTERS[i]}`} />
          </label>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>Select the radio next to the correct answer. Currently: <b>{LETTERS[f.a]}</b></p>
      {err && <div className="form-err" role="alert">⚠️ {err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add question'}</button>
        <button className="btn btn-ghost" type="button" onClick={() => { setF(EMPTY_FORM); setErr(''); }}>Clear</button>
      </div>
    </form>
  );
}

function Questions({ quizzes, addQuestion, removeQuestion, resetQuiz, onToast }) {
  const [qid, setQid] = useState(quizzes[0].id);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // {type:'remove', q} | {type:'reset'}
  const quiz = quizzes.find(q => q.id === qid) || quizzes[0];
  const list = quiz.questions.filter(x => !search || x.q.toLowerCase().includes(search.toLowerCase()) || x.opts.some(o => o.toLowerCase().includes(search.toLowerCase())));
  return (
    <>
      <div className="filters quiz-picker">
        {quizzes.map(q => <button key={q.id} className={q.id === qid ? 'active' : ''} onClick={() => { setQid(q.id); setSearch(''); }}>{q.icon} {q.title} <small>({q.questions.length})</small></button>)}
      </div>
      <div className="admin-two">
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card panel">
            <h3>{quiz.icon} {quiz.title} <span>{quiz.questions.length} questions · {quiz.minutes} min{quiz.edited ? ' · edited' : ''}</span></h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input id="qSearch" className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions or options…" />
              {quiz.edited && <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ type: 'reset' })}>↺ Reset to default</button>}
            </div>
          </div>
          <div className="q-admin-list">
            {list.length ? list.map((x, i) => (
              <div key={x.id} className={`card q-admin-item${x.id.startsWith('custom') ? ' custom' : ''}`}>
                <div className="qa-head">
                  <span className="qnum">Q{quiz.questions.indexOf(x) + 1}{x.id.startsWith('custom') && <span className="chip easy" style={{ marginLeft: 8 }}>Added by admin</span>}</span>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => setConfirm({ type: 'remove', q: x })}>🗑 Remove</button>
                </div>
                <div className={`qa-text${quiz.hindi ? ' hi' : ''}`}>{x.q}</div>
                <div className="qa-opts">{x.opts.map((o, k) => <span key={k} className={k === x.a ? 'ok' : ''}><b>{LETTERS[k]}</b> {o}</span>)}</div>
              </div>
            )) : <div className="card"><EmptyState emoji="🔍" title="No questions match" text={search ? `Nothing in ${quiz.title} matches "${search}".` : 'This quiz has no questions yet. Add one on the right.'} /></div>}
          </div>
        </div>
        <QuestionForm quiz={quiz} onAdd={addQuestion} onToast={onToast} />
      </div>
      {confirm?.type === 'remove' && <ConfirmModal emoji="🗑️" title="Remove this question?" text={`"${confirm.q.q.slice(0, 80)}${confirm.q.q.length > 80 ? '…' : ''}" will be removed from ${quiz.title}.`} cancel="Keep it" ok="Remove" onOk={async () => { setConfirm(null); try { await removeQuestion(quiz.id, confirm.q.id); onToast('Question removed'); } catch (ex) { onToast(ex.message || "Couldn't remove the question"); } }} onClose={() => setConfirm(null)} />}
      {confirm?.type === 'reset' && <ConfirmModal emoji="↺" title="Reset to default questions?" text={`All admin changes to ${quiz.title} will be discarded and the original question bank restored.`} cancel="Cancel" ok="Reset quiz" onOk={async () => { setConfirm(null); try { await resetQuiz(quiz.id); onToast('Quiz restored to defaults'); } catch (ex) { onToast(ex.message || "Couldn't reset the quiz"); } }} onClose={() => setConfirm(null)} />}
    </>
  );
}

/* ---------- Users directory ---------- */
function UserDetail({ user, attempts, byId, onClose }) {
  const s = userSummary(attempts);
  const rows = attempts.slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal onClose={onClose} wide>
      <ModalHead title={`${user.name}`} onClose={onClose} />
      <div className="ud-head">
        <span className="avatar" style={{ background: user.role === 'admin' ? 'var(--grad-exam)' : user.color, width: 56, height: 56, fontSize: 18 }}>{initials(user.name)}</span>
        <div><div style={{ color: 'var(--muted)', fontSize: 14 }}>{user.email}</div><div style={{ fontSize: 13, marginTop: 2 }}>{user.sub} · joined {fmtDate(user.joined)} · <span className={`chip ${user.role === 'admin' ? 'mixed' : 'easy'}`}>{user.role}</span></div></div>
      </div>
      <div className="stats-grid" style={{ margin: '16px 0' }}>
        <div className="card stat"><b className="tabular">{s.n}</b><span>Quizzes attempted</span></div>
        <div className="card stat"><b className="tabular">{s.avg}%</b><span>Average score</span></div>
        <div className="card stat"><b className="tabular">{s.best}%</b><span>Best score</span></div>
      </div>
      <h4 style={{ fontSize: 15, marginBottom: 10 }}>Attempt history</h4>
      <div className="recent">
        {rows.length ? rows.map((a, i) => { const q = byId(a.quiz); if (!q) return null; const p = pctOf(a);
          return <div key={i} className="recent-item"><span className="ic" style={{ background: q.grad }}>{q.icon}</span><div className="info"><b>{q.title}</b><span>{fmtDate(a.date)} · {fmtLong(a.time)}</span></div><div className="sc" style={{ color: p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--ink)' : 'var(--bad)' }}>{a.score}/{a.total}<small>{p}%</small></div></div>; })
          : <EmptyState emoji="🎮" title="No attempts yet" text="This user hasn't played a quiz." />}
      </div>
    </Modal>
  );
}

function Users({ users, attempts, byId }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('student');
  const [sel, setSel] = useState(null);
  const rows = useMemo(() => users
    .filter(u => role === 'all' || u.role === role)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .map(u => ({ u, s: userSummary(attempts.filter(a => a.user === u.id)) }))
    .sort((a, b) => b.s.n - a.s.n), [users, attempts, search, role]);
  return (
    <>
      <div className="card panel">
        <h3>User directory <span>{users.filter(u => u.role === "student").length} student{users.filter(u => u.role === "student").length === 1 ? "" : "s"} · {users.filter(u => u.role === 'admin').length} admin{users.filter(u => u.role === 'admin').length === 1 ? '' : 's'}</span></h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input id="uSearch" className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" />
          <div className="filters">{[['student', 'Students'], ['admin', 'Admins'], ['all', 'All']].map(([k, l]) => <button key={k} className={role === k ? 'active' : ''} onClick={() => setRole(k)}>{l}</button>)}</div>
        </div>
      </div>
      <div className="card table-wrap">
        {rows.length ? (
          <table className="tbl">
            <thead><tr><th>User</th><th>Role</th><th>Joined</th><th className="num">Quizzes</th><th className="num">Avg</th><th className="num">Best</th><th>Last active</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ u, s }) => (
                <tr key={u.id} onClick={() => setSel(u)}>
                  <td><div className="student"><span className="avatar" style={{ background: u.role === 'admin' ? 'var(--grad-exam)' : u.color }}>{initials(u.name)}</span><div style={{ minWidth: 0 }}><b>{u.name}</b><span>{u.email}</span></div></div></td>
                  <td><span className={`chip ${u.role === 'admin' ? 'mixed' : 'easy'}`}>{u.role}</span></td>
                  <td>{fmtDate(u.joined)}</td>
                  <td className="num tabular">{s.n}</td>
                  <td className="num tabular">{s.n ? `${s.avg}%` : '—'}</td>
                  <td className="num tabular">{s.n ? `${s.best}%` : '—'}</td>
                  <td>{s.last ? fmtDate(s.last) : <span style={{ color: 'var(--muted)' }}>Never</span>}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSel(u); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : search
          ? <EmptyState emoji="🔍" title="No users found" text={`No ${role === 'all' ? 'accounts' : role + 's'} match "${search}".`} />
          : <EmptyState emoji="👥" title="No students yet" text="Accounts appear here as soon as students sign up on the site. Their quiz attempts, scores and activity will show automatically." />}
      </div>
      {sel && <UserDetail user={sel} attempts={attempts.filter(a => a.user === sel.id)} byId={byId} onClose={() => setSel(null)} />}
    </>
  );
}

/* ---------- Settings: invite code rotation + account shortcuts ---------- */
/* QUIZ-XXXX-XXXX from an unambiguous alphabet (no O/0/I/1) */
function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = n => Array.from(crypto.getRandomValues(new Uint32Array(n)), v => A[v % A.length]).join('');
  return `QUIZ-${pick(4)}-${pick(4)}`;
}

function Settings({ admin, users, onToast, onNav }) {
  const [code, setCode] = useState(''); const [code2, setCode2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(null); const [show, setShow] = useState(false);
  const admins = users.filter(u => u.role === 'admin');
  useEffect(() => { backend.admin.getInviteCode().then(r => setCurrent(r.code || '')); }, []);
  const generate = () => { const c = makeCode(); setCode(c); setCode2(c); setErr(''); onToast('Code generated — review it, then save'); };
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); onToast('Invite code copied'); }
    catch (e) { onToast(text); }
  };
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    if (code.trim().length < 6) return setErr('Use at least 6 characters.');
    if (code !== code2) return setErr('The two codes do not match.');
    setBusy(true); const r = await backend.admin.setInviteCode(code); setBusy(false);
    if (r.error) return setErr(r.error);
    setCurrent(code.trim()); setCode(''); setCode2(''); setErr(''); setShow(true); onToast('Admin invite code updated');
  };
  return (
    <div className="dash-grid">
      <form className="card panel" onSubmit={submit} noValidate>
        <h3>🔑 Admin invite code <span>Required to create new admin accounts</span></h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>Share this code with anyone who should manage the site: they sign up on the normal form and enter it under “I have an admin invite code”. Rotate it whenever someone leaves the team.</p>
        <div className="invite-now">
          <div>
            <span>Current code</span>
            <b className="tabular">{current === null ? 'Loading…' : show ? (current || 'not set') : '•'.repeat(Math.max(8, (current || '').length))}</b>
          </div>
          <div className="invite-acts">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow(v => !v)}>{show ? '🙈 Hide' : '👁️ Show'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(current)} disabled={!current}>📋 Copy</button>
          </div>
        </div>
        <div className="field"><label htmlFor="invNew">New invite code</label><input id="invNew" value={code} onChange={e => { setCode(e.target.value); setErr(''); }} placeholder="Type one or generate it" autoComplete="off" /></div>
        <div className="field"><label htmlFor="invNew2">Confirm new invite code</label><input id="invNew2" value={code2} onChange={e => { setCode2(e.target.value); setErr(''); }} autoComplete="off" /></div>
        {err && <div className="form-err" role="alert">⚠️ {err}</div>}
        <div className="invite-btns">
          <button className="btn btn-orange" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update invite code'}</button>
          <button className="btn btn-ghost" type="button" onClick={generate}>🎲 Generate a code</button>
        </div>
      </form>
      <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
        <div className="card panel">
          <h3>👤 Your admin account</h3>
          <p style={{ fontSize: 14.5, marginBottom: 12 }}><b>{admin.name}</b><br /><span style={{ color: 'var(--muted)' }}>{admin.email}</span></p>
          <button className="btn btn-ghost" onClick={() => onNav('#account')}>⚙️ Change password or name →</button>
        </div>
        <div className="card panel">
          <h3>🛡️ Admins <span>{admins.length} account{admins.length === 1 ? '' : 's'}</span></h3>
          <div className="recent">
            {admins.map(a => <div key={a.id} className="recent-item"><span className="avatar" style={{ background: 'var(--grad-exam)' }}>{initials(a.name)}</span><div className="info"><b>{a.name}{a.id === admin.id ? ' (you)' : ''}</b><span>{a.email || 'admin'} · since {fmtDate(a.joined)}</span></div></div>)}
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>To add an admin: share the code above; they sign up on the normal form and paste it under “I have an admin invite code”.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin shell ---------- */
export default function Admin({ admin, users, attempts, quizzes, byId, addQuestion, removeQuestion, resetQuiz, onToast, onLogin, onNav }) {
  const [tab, setTab] = useState('overview');
  if (!admin || admin.role !== 'admin') {
    return (
      <main><div className="container" style={{ paddingBlock: 60 }}>
        <div className="card"><EmptyState emoji="🔐" title="Admin access only" text={admin ? `You're logged in as ${admin.name} (student). Log in with an admin account to manage questions and users.` : 'Log in with an admin account to manage questions and view user details.'}>
          <button className="btn btn-orange" style={{ marginTop: 8 }} onClick={onLogin}>🔑 Log in</button>
        </EmptyState></div>
      </div></main>
    );
  }
  return (
    <main>
      <div className="container dash">
        <div className="card dash-hero" style={{ background: 'var(--grad-exam)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.85 }}>Admin Panel</div>
            <h1>Hello, {admin.name} 🛡️</h1>
            <p>Manage the question bank and keep an eye on how students are doing.</p>
          </div>
          <div className="filters admin-tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        </div>
        {tab === 'overview' && <Overview users={users} attempts={attempts} quizzes={quizzes} byId={byId} />}
        {tab === 'questions' && <Questions quizzes={quizzes} addQuestion={addQuestion} removeQuestion={removeQuestion} resetQuiz={resetQuiz} onToast={onToast} />}
        {tab === 'users' && <Users users={users} attempts={attempts} byId={byId} />}
        {tab === 'settings' && <Settings admin={admin} users={users} onToast={onToast} onNav={onNav} />}
      </div>
    </main>
  );
}
