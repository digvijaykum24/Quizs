import { useEffect, useMemo, useState } from 'react';
import { fmtDate, fmtLong, initials, LETTERS, pctOf, userSummary } from '../utils.js';
import { ConfirmModal, EmptyState, Modal, ModalHead } from './ui.jsx';
import { NameForm, PasswordForm } from './Account.jsx';
import { backend } from '../backend/index.js';

const TABS = [['overview', '📊 Overview'], ['attempts', '📋 Attempts'], ['questions', '📝 Questions'],
  ['students', '👥 Students'], ['analytics', '📈 Analytics'], ['profile', '👤 Profile']];

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

function Users({ users, attempts, byId, admin, onSetRole, onDeleteUser }) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('student');
  const [sel, setSel] = useState(null);
  const [ask, setAsk] = useState(null);     // {user, to} pending role change
  const [busy, setBusy] = useState(null);
  const changeRole = async () => {
    const { user, to } = ask; setAsk(null); setBusy(user.id);
    await onSetRole(user, to); setBusy(null);
  };
  const [del, setDel] = useState(null);      // account pending removal
  const removeUser = async () => {
    const u = del; setDel(null); setBusy(u.id);
    await onDeleteUser(u); setBusy(null); setSel(null);
  };
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
                  <td data-label="User" className="cell-user"><div className="student"><span className="avatar" style={{ background: u.role === 'admin' ? 'var(--grad-exam)' : u.color }}>{initials(u.name)}</span><div style={{ minWidth: 0 }}><b>{u.name}</b><span>{u.email}</span></div></div></td>
                  <td data-label="Role"><span className={`chip ${u.role === 'admin' ? 'mixed' : 'easy'}`}>{u.role}</span></td>
                  <td data-label="Joined">{fmtDate(u.joined)}</td>
                  <td data-label="Quizzes" className="num tabular">{s.n}</td>
                  <td data-label="Average" className="num tabular">{s.n ? `${s.avg}%` : '—'}</td>
                  <td data-label="Best" className="num tabular">{s.n ? `${s.best}%` : '—'}</td>
                  <td data-label="Last active">{s.last ? fmtDate(s.last) : <span style={{ color: 'var(--muted)' }}>Never</span>}</td>
                  <td>
                    <div className="row-acts">
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSel(u); }}>View</button>
                      {u.id !== admin.id && (
                        <>
                          <button className={`btn btn-sm ${u.role === 'admin' ? 'btn-ghost' : 'btn-orange'}`} disabled={busy === u.id}
                            onClick={e => { e.stopPropagation(); setAsk({ user: u, to: u.role === 'admin' ? 'student' : 'admin' }); }}>
                            {busy === u.id ? '…' : u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                          <button className="btn btn-sm btn-danger" disabled={busy === u.id}
                            onClick={e => { e.stopPropagation(); setDel(u); }}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : search
          ? <EmptyState emoji="🔍" title="No users found" text={`No ${role === 'all' ? 'accounts' : role + 's'} match "${search}".`} />
          : <EmptyState emoji="👥" title="No students yet" text="Accounts appear here as soon as students sign up on the site. Their quiz attempts, scores and activity will show automatically." />}
      </div>
      {sel && <UserDetail user={sel} attempts={attempts.filter(a => a.user === sel.id)} byId={byId} onClose={() => setSel(null)} />}
      {del && <ConfirmModal emoji="🗑️" title={`Remove ${del.name}?`}
        text={`This deletes the account for ${del.email} along with every quiz attempt and duel it owns, and takes them off the leaderboard. This cannot be undone.`}
        cancel="Keep account" ok="Delete permanently" okClass="btn-danger" onOk={removeUser} onClose={() => setDel(null)} />}
      {ask && <ConfirmModal emoji={ask.to === 'admin' ? '🛡️' : '👤'}
        title={ask.to === 'admin' ? `Make ${ask.user.name} an admin?` : `Remove ${ask.user.name}'s admin access?`}
        text={ask.to === 'admin'
          ? 'They will be able to add and remove questions, see every student and their email, and promote other admins. They land in the admin panel next time they log in.'
          : 'They keep their account and scores but go back to being a normal student.'}
        cancel="Cancel" ok={ask.to === 'admin' ? 'Make admin' : 'Remove admin'} okClass={ask.to === 'admin' ? 'btn-orange' : 'btn-primary'}
        onOk={changeRole} onClose={() => setAsk(null)} />}
    </>
  );
}

/* ---------- Settings: invite code rotation + account shortcuts ---------- */
/* ---------- Attempts: every quiz submission, searchable and exportable ---------- */
function Attempts({ users, attempts, byId, onToast }) {
  const [q, setQ] = useState('');
  const [quizFilter, setQuizFilter] = useState('all');
  const [limit, setLimit] = useState(25);
  const nameOf = id => users.find(u => u.id === id)?.name || 'Guest';

  const rows = useMemo(() => attempts
    .filter(a => quizFilter === 'all' || a.quiz === quizFilter)
    .filter(a => {
      if (!q.trim()) return true;
      const t = q.trim().toLowerCase();
      return nameOf(a.user).toLowerCase().includes(t) || (byId(a.quiz)?.title || a.quiz).toLowerCase().includes(t);
    })
    .sort((x, y) => new Date(y.date) - new Date(x.date)), [attempts, q, quizFilter, users]);

  const quizzesSeen = [...new Set(attempts.map(a => a.quiz))];
  const exportCsv = () => {
    const head = ['Student', 'Quiz', 'Score', 'Total', 'Percent', 'Points', 'Time (s)', 'Date'];
    const body = rows.map(a => [nameOf(a.user), byId(a.quiz)?.title || a.quiz, a.score, a.total, pctOf(a), a.points ?? '', a.time ?? '', new Date(a.date).toISOString()]);
    const csv = [head, ...body].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `quizarena-attempts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${rows.length} attempt${rows.length === 1 ? '' : 's'}`);
  };

  return (
    <div className="card panel">
      <h3>📋 Attempts <span>{rows.length} of {attempts.length} shown</span></h3>
      <div className="admin-toolbar">
        <input className="admin-search" value={q} onChange={e => { setQ(e.target.value); setLimit(25); }} placeholder="Search student or quiz…" aria-label="Search attempts" />
        <select value={quizFilter} onChange={e => { setQuizFilter(e.target.value); setLimit(25); }} aria-label="Filter by quiz">
          <option value="all">All quizzes</option>
          {quizzesSeen.map(id => <option key={id} value={id}>{byId(id)?.title || id}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!rows.length}>⬇️ Export CSV</button>
      </div>
      {rows.length ? (
        <>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>%</th><th>Points</th><th>When</th></tr></thead>
              <tbody>
                {rows.slice(0, limit).map(a => (
                  <tr key={a.id}>
                    <td data-label="Student"><b className="cell-main">{nameOf(a.user)}</b></td>
                    <td data-label="Quiz">{byId(a.quiz)?.title || a.quiz}</td>
                    <td data-label="Score" className="tabular">{a.score}/{a.total}</td>
                    <td data-label="Percent"><span className={`chip ${pctOf(a) >= 80 ? 'easy' : pctOf(a) >= 50 ? 'mixed' : 'hard'}`}>{pctOf(a)}%</span></td>
                    <td data-label="Points" className="tabular">{a.points ?? '—'}</td>
                    <td data-label="When">{fmtDate(a.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > limit && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setLimit(l => l + 50)}>Show more ({rows.length - limit} left)</button>}
        </>
      ) : <EmptyState emoji="📭" title="No attempts match" text="Try a different search, or clear the quiz filter." />}
    </div>
  );
}

/* ---------- Analytics: engagement in place of a shop's revenue ---------- */
function Analytics({ users, attempts, quizzes, byId }) {
  const now = Date.now(), DAY = 86400000;
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), n: attempts.filter(a => a.date.slice(0, 10) === key).length };
  });
  const peak = Math.max(1, ...days.map(d => d.n));
  const within = ms => attempts.filter(a => now - new Date(a.date).getTime() < ms);
  const active7 = new Set(within(7 * DAY).map(a => a.user)).size;
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + pctOf(a), 0) / attempts.length) : 0;
  const students = users.filter(u => u.role !== 'admin');
  const engaged = students.filter(u => attempts.some(a => a.user === u.id)).length;

  const perQuiz = quizzes.map(qz => {
    const mine = attempts.filter(a => a.quiz === qz.id);
    return { id: qz.id, title: qz.title, icon: qz.icon, n: mine.length,
      avg: mine.length ? Math.round(mine.reduce((s, a) => s + pctOf(a), 0) / mine.length) : 0 };
  }).sort((a, b) => b.n - a.n);
  const busiest = Math.max(1, ...perQuiz.map(q => q.n));

  const top = students.map(u => {
    const mine = attempts.filter(a => a.user === u.id);
    return { ...u, n: mine.length, pts: mine.reduce((s, a) => s + (a.points || 0), 0) };
  }).filter(u => u.n).sort((a, b) => b.pts - a.pts).slice(0, 5);

  const kpis = [
    ['📝', attempts.length, 'Total attempts', '#EEF2FF'],
    ['🔥', within(7 * DAY).length, 'Attempts this week', '#FFF7ED'],
    ['🙋', active7, 'Active students (7d)', '#ECFDF3'],
    ['🎯', `${avgScore}%`, 'Average score', '#ECFEFF'],
    ['👥', `${engaged}/${students.length}`, 'Students who played', '#FDF4FF'],
    ['⚡', attempts.reduce((s, a) => s + (a.points || 0), 0), 'Points awarded', '#FEF2F2']
  ];

  if (!attempts.length) return <EmptyState emoji="📈" title="No data yet" text="Once students start playing, activity trends, per-quiz performance and top performers appear here." />;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="stats-grid">
        {kpis.map(k => <div key={k[2]} className="card stat"><span className="ic" style={{ background: k[3] }}>{k[0]}</span><b className="tabular">{k[1]}</b><span>{k[2]}</span></div>)}
      </div>
      <div className="card panel">
        <h3>📅 Activity <span>attempts per day, last 14 days</span></h3>
        <div className="spark" role="img" aria-label={`Daily attempts: ${days.map(d => `${d.label} ${d.n}`).join(', ')}`}>
          {days.map(d => (
            <div key={d.key} className="spark-col" title={`${d.label}: ${d.n}`}>
              <i style={{ height: `${Math.round((d.n / peak) * 100)}%` }} />
              <span>{d.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dash-grid">
        <div className="card panel">
          <h3>📚 By quiz <span>attempts and average score</span></h3>
          {perQuiz.filter(q => q.n).map(q => (
            <div key={q.id} className="anl-row">
              <div className="anl-label">{q.icon} {q.title}</div>
              <div className="anl-bar"><i style={{ width: `${Math.round((q.n / busiest) * 100)}%` }} /></div>
              <div className="anl-num tabular">{q.n} · {q.avg}%</div>
            </div>
          ))}
          {!perQuiz.some(q => q.n) && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>No quiz has been attempted yet.</p>}
        </div>
        <div className="card panel">
          <h3>🏅 Top performers <span>by points earned</span></h3>
          <div className="recent">
            {top.length ? top.map((u, i) => (
              <div key={u.id} className="recent-item">
                <span className="avatar" style={{ background: u.color }}>{initials(u.name)}</span>
                <div className="info"><b>{i + 1}. {u.name}</b><span>{u.n} quiz{u.n === 1 ? '' : 'zes'}</span></div>
                <b className="tabular">{u.pts}</b>
              </div>
            )) : <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Nobody has scored points yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Profile: the admin's own account, without leaving the panel ---------- */
function Profile({ admin, onUpdateName, onUpdatePassword, onToast, onLogout }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card acct-hero">
        <span className="avatar" style={{ background: 'var(--grad-exam)' }}>{initials(admin.name)}</span>
        <div>
          <h1 style={{ fontSize: 22 }}>{admin.name}</h1>
          <div className="meta"><span>{admin.email}</span><span className="chip mixed">Admin</span><span>Since {fmtDate(admin.joined)}</span></div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onLogout}>🚪 Log out</button>
      </div>
      <div className="acct-grid">
        <NameForm user={admin} onUpdateName={onUpdateName} onToast={onToast} />
        <PasswordForm onUpdatePassword={onUpdatePassword} onToast={onToast} />
      </div>
    </div>
  );
}

/* ---------- Admin shell ---------- */
export default function Admin({ admin, users, attempts, quizzes, byId, addQuestion, removeQuestion, resetQuiz, onToast, onLogin, onNav, onUpdateName, onUpdatePassword, onLogout, onSetRole, onDeleteUser }) {
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
        {tab === 'attempts' && <Attempts users={users} attempts={attempts} byId={byId} onToast={onToast} />}
        {tab === 'students' && <Users users={users} attempts={attempts} byId={byId} admin={admin} onSetRole={onSetRole} onDeleteUser={onDeleteUser} />}
        {tab === 'analytics' && <Analytics users={users} attempts={attempts} quizzes={quizzes} byId={byId} />}
        {tab === 'profile' && <Profile admin={admin} onUpdateName={onUpdateName} onUpdatePassword={onUpdatePassword} onToast={onToast} onLogout={onLogout} />}
      </div>
    </main>
  );
}
