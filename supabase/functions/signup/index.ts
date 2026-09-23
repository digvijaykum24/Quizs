// QuizArena sign-up: creates the account already confirmed so no confirmation email is ever sent.
// Public endpoint (like Supabase's own /signup); validates input and the admin invite code server-side.
// Deploy: supabase functions deploy signup --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const COLORS = ['#4F46E5', '#F97316', '#06B6D4', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B', '#14B8A6', '#EF4444'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = body.role === 'admin' ? 'admin' : 'student';
  const code = String(body.code ?? '').trim();

  if (name.length < 2 || name.length > 60) return json({ error: 'Enter your full name.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (role === 'admin') {
    const { data } = await admin.from('app_settings').select('value').eq('key', 'admin_invite_code').maybeSingle();
    if (!data || data.value !== code) return json({ error: 'Invalid admin invite code.' }, 400);
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, admin_code: role === 'admin' ? code : '', color: COLORS[name.length % COLORS.length] },
  });
  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('already') || m.includes('exists') || m.includes('registered')) return json({ error: 'An account with this email already exists.' }, 409);
    if (m.includes('invalid') && m.includes('email')) return json({ error: 'That email address looks invalid.' }, 400);
    return json({ error: error.message }, 400);
  }
  return json({ ok: true });
});
