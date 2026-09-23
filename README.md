# QuizArena

Gamified quiz / mock-test platform — React 18 + Vite, with Supabase for authentication and data.

## Run locally

```bash
cp .env.example .env   # then paste your Supabase URL + publishable key
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (uses Supabase, from .env)
npm run build:demo # offline demo build in dist-demo/ (browser-local storage, no backend)
```

## Deploy (static hosting)

`npm run build` produces a static site in `dist/`. Upload that folder to any static host
(Netlify, Vercel, GitHub Pages, Cloudflare Pages, Hostinger, cPanel…). `vite.config.js` uses
`base: './'` so it works from a sub-folder too.

## Backend: Supabase

Accounts, quiz attempts, the public leaderboard and admin question edits live in Supabase
(project **Quizs Project**, region `ap-south-1`). Schema + row-level-security policies: `supabase/schema.sql`.

- `.env` (not committed — copy `.env.example` and fill it in) holds `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`. The publishable key is safe to ship to browsers — the database enforces
  access with RLS. Without these vars the app falls back to browser-local storage
  (`src/backend/local.js`), which is what `npm run build:demo` produces.
- **Auth**: one unified section for everyone (`src/components/Auth.jsx`) - students and admins log in
  with the same form, sign up in the same card, and reset a forgotten password without leaving it.
  It renders as a page at `#login` and as a modal for mid-flow prompts. The account's own role decides
  where a login lands (admin -> admin panel, student -> dashboard). An account becomes an admin only by
  entering the invite code at sign-up.
  Sign-up goes through the `signup` Edge Function
  (`supabase/functions/signup`), which creates the account **already confirmed** — no confirmation
  email, so Supabase's 2-emails/hour mailer limit never blocks sign-ups. A `profiles` row is created
  automatically (trigger). Signing up with **Admin** + the invite code creates an admin account.
- **Admin invite code** lives in `app_settings`; only admins can read it (`admin_get_invite()`) or change
  it (`set_admin_invite()`), both enforced in the database. Manage it in **Admin panel -> Settings**:
  show/copy the current code, or hit **Generate a code** for a random `QUIZ-XXXX-XXXX` one and save.
  Someone with the code becomes an admin by entering it at sign-up under "I have an admin invite code".
- **Passwords** are changed from the site: avatar menu → **Account settings** → *Change password*
  (the current password is required). Forgot it? The login form's **Forgot password?** emails a reset link.
- What each role can do is enforced in the database, not just the UI: students can only insert their own
  attempts; only admins can add/remove questions or read the user directory (emails).

### Recommended Supabase dashboard settings before launch
1. Email confirmation is no longer needed for sign-up (handled by the Edge Function). The only emails the
   app sends are **password-reset links**; the built-in mailer allows ~2/hour, so add your own SMTP
   (Authentication → SMTP Settings) if you expect many resets.
2. **Authentication → URL Configuration** — set *Site URL* to your live domain.
3. **Authentication → Password security** - enable leaked-password protection.
4. **Authentication → Rate Limits** - logins are not limited by the app; Supabase allows 1800 sign-in
   requests per hour per IP (bursts of 30) by default. Raise it there if a whole school shares one IP.

## Structure

```
src/
├─ App.jsx               views, navigation, modals, quiz lifecycle
├─ data.js               question banks, categories, badges
├─ utils.js              stats, leaderboard scoring
├─ backend/
│  ├─ index.js           picks Supabase (env configured) or local
│  ├─ supabase.js        auth + tables + RPCs
│  └─ local.js           localStorage fallback with the same interface
├─ hooks/index.js        useAuth · useUsers · useAttempts · useQuizzes · useScrollSpy · …
└─ components/
   ├─ Layout.jsx         Navbar, mobile menu, bottom nav, footer
   ├─ Home.jsx           Hero, quiz cards, categories, public leaderboard, how it works
   ├─ Quiz.jsx           timed quiz engine
   ├─ Result.jsx         score ring, confetti, answer review, share
   ├─ Dashboard.jsx      student dashboard (works for guests too, with a sign-up nudge)
   ├─ Admin.jsx          admin panel: overview, question manager, user directory, settings
   ├─ Account.jsx        account settings: display name, change password, log out
   ├─ Auth.jsx           unified log in / sign up / forgot password (page + modal)
   ├─ Duel.jsx           live 1v1 duel: lobby, waiting room, round, result
   └─ ui.jsx             shared components (modals, badges, toasts)
supabase/schema.sql      database schema, trigger, RLS policies, duel tables + functions
```

Leaderboard scoring: 10 points per correct answer, +50 when a quiz is finished in under half its time limit.
Anyone can play as a guest — no account needed. Guest scores stay in that browser (`qa_guest_attempts`)
and are not ranked. When a guest signs up or logs in, their guest scores are uploaded to the account
automatically, so the leaderboard only ever shows real accounts.

## Live Duel (`#duel`)

Two signed-in students answer the same 7 questions against one shared 15-second clock.

- **Matchmaking**: create a challenge to get a 6-character code, or accept one from the open list
  (challenges stay listed for 30 minutes). The round starts the moment the second player joins.
- **Sync**: the duel row in Postgres is the single source of truth - question index, deadline and
  scores. Both browsers get changes pushed over Supabase Realtime (measured ~0.5s), and poll
  `duel_get` every 3s as a fallback so a dropped socket can't freeze a round. Each reply carries the
  server's clock, so the countdown stays identical even when device clocks disagree.
- **Advancing**: a question closes when both players answer, or when the deadline passes - whichever
  comes first. Either client may call `duel_tick` at zero; it is idempotent, so both calling is fine.
- **Scoring**: 10 points per correct answer plus up to 5 more the faster you answer. Scoring happens
  in `duel_answer` against the key stored with the duel; browsers only send the option they picked.
- Leaving a live duel forfeits it; leaving a waiting one cancels it.

Note: base quiz questions ship inside the JS bundle, so a determined student could read answers from
it - true of the solo quizzes too. Moving the question bank server-side would fix that for both.
