/* Supabase backend: auth + shared data for the hosted site.
   Tables/functions are defined in supabase/schema.sql. */
import { createClient } from '@supabase/supabase-js';

const AV = ['#4F46E5', '#F97316', '#06B6D4', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B', '#14B8A6', '#EF4444'];

export function createSupabaseBackend(url, key) {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

  const toUser = (authUser, p) => authUser && p ? { id: p.id, name: p.name, email: authUser.email, role: p.role, color: p.color, joined: p.created_at, sub: p.role === 'admin' ? 'Platform admin' : 'Student' } : null;
  const profileOf = async authUser => {
    if (!authUser) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    return toUser(authUser, data);
  };
  const friendly = e => {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('invalid login')) return 'Incorrect email or password.';
    if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link.';
    if (m.includes('already registered') || m.includes('already exists')) return 'An account with this email already exists.';
    if (m.includes('password')) return 'Password must be at least 6 characters.';
    if (m.includes('email rate limit')) return 'Sign-up is temporarily paused: the confirmation-email limit was reached. Please try again in about an hour. (Site admin: turn off "Confirm email" in Supabase Auth to allow instant sign-up.)';
    if (m.includes('rate limit') || m.includes('too many')) return 'The server is busy right now. Please wait a moment and try again.';
    return e?.message || 'Something went wrong. Please try again.';
  };

  const auth = {
    async getUser() { const { data } = await sb.auth.getSession(); return profileOf(data.session?.user); },
    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') cb(null);
        else if (session?.user) profileOf(session.user).then(cb);
      });
      return () => data.subscription.unsubscribe();
    },
    /* One sign-in for students and admins alike - the account's own role decides where it lands */
    async signIn({ email, password }) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) return { error: friendly(error) };
      return { user: await profileOf(data.user) };
    },
    /* Sign-up goes through the `signup` Edge Function, which creates the account already confirmed
       (no confirmation email, so no mail rate limits), then we log the user in right away. */
    async signUp({ name, email, password, role, code }) {
      if (!name.trim()) return { error: 'Enter your name.' };
      if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
      let res;
      try {
        res = await fetch(`${url}/functions/v1/signup`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key },
          body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role, code })
        });
      } catch (e) { return { error: 'Could not reach the server. Check your connection and try again.' }; }
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) return { error: out.error || 'Sign-up failed. Please try again.' };
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) return { error: friendly(error) };
      return { user: await profileOf(data.user) };
    },
    async signOut() { await sb.auth.signOut(); },
    /* Fires when the user arrives from a password-reset email link */
    onRecovery(cb) {
      const { data } = sb.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') cb(); });
      return () => data.subscription.unsubscribe();
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: location.origin + location.pathname });
      if (error) return { error: friendly(error) };
      return { info: 'If an account exists for that email, a reset link is on its way. Open it to choose a new password.' };
    },
    /* Change password with the current one verified first */
    async updatePassword({ email, currentPassword, newPassword }) {
      if (newPassword.length < 6) return { error: 'New password must be at least 6 characters.' };
      const { error: e1 } = await sb.auth.signInWithPassword({ email, password: currentPassword });
      if (e1) return { error: 'Current password is incorrect.' };
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) return { error: friendly(error) };
      return { ok: true };
    },
    /* Set a new password during recovery (no current password) */
    async setPassword(newPassword) {
      if (newPassword.length < 6) return { error: 'Password must be at least 6 characters.' };
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) return { error: friendly(error) };
      return { ok: true };
    },
    async updateName(name) {
      const n = name.trim(); if (n.length < 2) return { error: 'Enter your full name.' };
      const { data: s } = await sb.auth.getSession(); const u = s.session?.user; if (!u) return { error: 'Not logged in.' };
      const { error } = await sb.from('profiles').update({ name: n }).eq('id', u.id);
      if (error) return { error: friendly(error) };
      await sb.auth.updateUser({ data: { name: n } });
      return { user: await profileOf(u) };
    }
  };

  const admin = {
    async getInviteCode() {
      const { data, error } = await sb.rpc('admin_get_invite');
      if (error) return { error: error.message.replace(/^.*?:\s*/, '') };
      return { code: data };
    },
    async setInviteCode(code) {
      const { error } = await sb.rpc('set_admin_invite', { new_code: code });
      if (error) return { error: error.message.replace(/^.*?:\s*/, '') };
      return { ok: true };
    }
  };


  /* ---- Live 1v1 duels. Every write goes through a SECURITY DEFINER function that
     owns the clock and the score, so neither browser can rush or fake a round. ---- */
  const unwrap = ({ data, error }) => (error
    ? { error: error.message.replace(/^.*?:\s*/, '') }
    : { duel: data.duel, now: Date.parse(data.now) });

  const duels = {
    supported: true,
    async create(quizId, qIds, qAns, perQ = 15) {
      return unwrap(await sb.rpc('duel_create', { p_quiz_id: quizId, p_q_ids: qIds, p_q_ans: qAns, p_per_q: perQ }));
    },
    async join(code) { return unwrap(await sb.rpc('duel_join', { p_code: code })); },
    async get(id) { return unwrap(await sb.rpc('duel_get', { p_id: id })); },
    async answer(id, qIndex, choice) { return unwrap(await sb.rpc('duel_answer', { p_id: id, p_q: qIndex, p_choice: choice })); },
    async tick(id) { return unwrap(await sb.rpc('duel_tick', { p_id: id })); },
    async leave(id) { return unwrap(await sb.rpc('duel_leave', { p_id: id })); },
    async open() { const { data } = await sb.rpc('duel_open'); return data || []; },
    async history() { const { data } = await sb.rpc('duel_history'); return data || []; },
    /* Realtime push: the duel row (state, scores, deadline) and each answer as it lands */
    subscribe(id, { onDuel, onAnswer }) {
      const ch = sb.channel(`duel:${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, p => onDuel?.(p.new))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'duel_answers', filter: `duel_id=eq.${id}` }, p => onAnswer?.(p.new))
        .subscribe();
      return () => sb.removeChannel(ch);
    }
  };

  const users = {
    /* Public profiles (no emails) for the leaderboard; admins get the full directory with emails */
    async list(asAdmin) {
      if (asAdmin) {
        const { data, error } = await sb.rpc('admin_list_users');
        if (!error && data) return data.map(p => ({ id: p.id, name: p.name, email: p.email, role: p.role, color: p.color, joined: p.created_at, sub: p.role === 'admin' ? 'Platform admin' : 'Student' }));
      }
      const { data } = await sb.from('profiles').select('id,name,role,color,created_at');
      return (data || []).map(p => ({ id: p.id, name: p.name, email: '', role: p.role, color: p.color, joined: p.created_at, sub: p.role === 'admin' ? 'Platform admin' : 'Student' }));
    }
  };

  const rowToAttempt = r => ({ id: r.id, user: r.user_id, quiz: r.quiz_id, score: r.score, total: r.total, attempted: r.attempted, time: r.time_sec, points: r.points, date: r.created_at });
  const attempts = {
    async list() {
      const { data } = await sb.from('attempts').select('*').order('created_at', { ascending: false }).limit(5000);
      return (data || []).map(rowToAttempt);
    },
    async add(a) {
      const { data, error } = await sb.from('attempts').insert({ user_id: a.user, quiz_id: a.quiz, score: a.score, total: a.total, attempted: a.attempted, time_sec: a.time, points: a.points }).select().single();
      if (error) throw new Error(friendly(error));
      return rowToAttempt(data);
    }
  };

  const questions = {
    async load() {
      const [{ data: custom }, { data: removed }] = await Promise.all([sb.from('custom_questions').select('*').order('created_at'), sb.from('removed_questions').select('question_id,quiz_id')]);
      const byQuiz = {};
      (custom || []).forEach(r => { (byQuiz[r.quiz_id] = byQuiz[r.quiz_id] || []).push({ id: r.id, q: r.q, opts: r.opts, a: r.a }); });
      return { custom: byQuiz, removed: (removed || []).map(r => r.question_id) };
    },
    async add(quizId, qq) {
      const row = { id: `custom-${Date.now()}`, quiz_id: quizId, q: qq.q, opts: qq.opts, a: qq.a };
      const { error } = await sb.from('custom_questions').insert(row);
      if (error) throw new Error(friendly(error));
      return { id: row.id, q: row.q, opts: row.opts, a: row.a };
    },
    async remove(quizId, qid) {
      const { error } = qid.startsWith('custom-')
        ? await sb.from('custom_questions').delete().eq('id', qid)
        : await sb.from('removed_questions').insert({ question_id: qid, quiz_id: quizId });
      if (error) throw new Error(friendly(error));
    },
    async reset(quizId) {
      await Promise.all([sb.from('custom_questions').delete().eq('quiz_id', quizId), sb.from('removed_questions').delete().eq('quiz_id', quizId)]);
    }
  };

  return { mode: 'supabase', auth, users, attempts, questions, admin, duels };
}
