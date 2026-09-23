/* Local backend: same interface as the Supabase one, backed by this browser's localStorage.
   Used automatically when no VITE_SUPABASE_URL is configured (previews / offline demos). */
import { ADMIN_INVITE_CODE, USERS } from '../data.js';

const AV = ['#4F46E5', '#F97316', '#06B6D4', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B', '#14B8A6', '#EF4444'];
const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const norm = e => String(e || '').trim().toLowerCase();
const wait = () => new Promise(r => setTimeout(r, 60));

export function createLocalBackend() {
  const allUsers = () => [...USERS, ...read('qa_users', [])];
  const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, color: u.color, joined: u.joined, sub: u.sub });
  let listeners = [];
  const emit = u => listeners.forEach(cb => cb(u));

  const auth = {
    async getUser() { const id = read('qa_session', null); const u = allUsers().find(x => x.id === id); return u ? pub(u) : null; },
    onChange(cb) { listeners.push(cb); return () => { listeners = listeners.filter(x => x !== cb); }; },
    async signIn({ email, password }) {
      await wait();
      const u = allUsers().find(x => x.email === norm(email));
      if (!u || u.password !== password) return { error: 'Incorrect email or password.' };
      if (role === 'student' && u.role === 'admin') return { error: 'This is an admin account. Switch to Admin login.' };
      write('qa_session', u.id); emit(pub(u)); return { user: pub(u) };
    },
    async signUp({ name, email, password, role, code }) {
      await wait();
      if (!name.trim()) return { error: 'Enter your name.' };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm(email))) return { error: 'Enter a valid email address.' };
      if (password.length < 6) return { error: 'Password must be at least 6 characters.' };
      if (allUsers().some(u => u.email === norm(email))) return { error: 'An account with this email already exists.' };
      const u = { id: `u-${Date.now()}`, name: name.trim(), email: norm(email), password, role, joined: new Date().toISOString(), sub: role === 'admin' ? 'Platform admin' : 'Student', color: AV[name.trim().length % AV.length] };
      write('qa_users', [...read('qa_users', []), u]); write('qa_session', u.id); emit(pub(u));
      return { user: pub(u) };
    },
    async signOut() { try { localStorage.removeItem('qa_session'); } catch (e) {} emit(null); },
    onRecovery() { return () => {}; },
    async resetPassword() { await wait(); return { info: 'Demo mode: reset emails are not sent. On the live site a reset link is emailed to you.' }; },
    async updatePassword({ currentPassword, newPassword }) {
      await wait();
      const id = read('qa_session', null); const extra = read('qa_users', []); const u = allUsers().find(x => x.id === id);
      if (!u) return { error: 'Not logged in.' };
      if (u.password !== currentPassword) return { error: 'Current password is incorrect.' };
      if (newPassword.length < 6) return { error: 'New password must be at least 6 characters.' };
      if (!extra.some(x => x.id === id)) return { error: 'The built-in demo admin password cannot be changed here — edit src/data.js.' };
      write('qa_users', extra.map(x => (x.id === id ? { ...x, password: newPassword } : x)));
      return { ok: true };
    },
    async setPassword(newPassword) { return this.updatePassword({ currentPassword: null, newPassword }); },
    async updateName(name) {
      await wait();
      const n = name.trim(); if (n.length < 2) return { error: 'Enter your full name.' };
      const id = read('qa_session', null); const extra = read('qa_users', []);
      if (!extra.some(x => x.id === id)) return { error: 'The built-in demo account cannot be renamed.' };
      const next = extra.map(x => (x.id === id ? { ...x, name: n } : x)); write('qa_users', next);
      const u = pub(next.find(x => x.id === id)); emit(u); return { user: u };
    }
  };

  const admin = {
    async getInviteCode() {
      const id = read('qa_session', null); const u = allUsers().find(x => x.id === id);
      if (!u || u.role !== 'admin') return { error: 'Only admins can view the invite code.' };
      return { code: read('qa_invite', ADMIN_INVITE_CODE) };
    },
    async setInviteCode(code) {
      await wait();
      const id = read('qa_session', null); const u = allUsers().find(x => x.id === id);
      if (!u || u.role !== 'admin') return { error: 'Only admins can change the invite code.' };
      if (code.trim().length < 6) return { error: 'Invite code must be at least 6 characters.' };
      write('qa_invite', code.trim()); return { ok: true };
    }
  };

  /* Duels need two live browsers talking to one server - not possible in offline demo mode */
  const duels = { supported: false };

  const users = { async list() { return allUsers().map(pub); } };

  const attempts = {
    async list() { return read('qa_attempts', []); },
    async add(a) { const rec = { ...a, id: Date.now() }; write('qa_attempts', [rec, ...read('qa_attempts', [])].slice(0, 500)); return rec; }
  };

  const questions = {
    async load() { return read('qa_qedits', { custom: {}, removed: [] }); },
    async add(quizId, qq) { const s = await this.load(); const row = { ...qq, id: `custom-${Date.now()}` }; (s.custom[quizId] = s.custom[quizId] || []).push(row); write('qa_qedits', s); return row; },
    async remove(quizId, qid) { const s = await this.load(); if (qid.startsWith('custom-')) s.custom[quizId] = (s.custom[quizId] || []).filter(x => x.id !== qid); else s.removed.push(qid); write('qa_qedits', s); },
    async reset(quizId) { const s = await this.load(); delete s.custom[quizId]; s.removed = s.removed.filter(id => !id.startsWith(quizId + '-')); write('qa_qedits', s); }
  };

  return { mode: 'local', auth, users, attempts, questions, admin, duels };
}
