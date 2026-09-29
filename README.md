# QuizArena

Gamified quiz / mock-test platform — React 18 + Vite, with Supabase for authentication and data.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (uses Supabase, from .env)
npm run build:demo # offline demo build in dist-demo/ (browser-local storage, no backend)
```

## Deploy

### GitHub Pages (automatic, already wired)
`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.
Enable it once: **repo Settings -> Pages -> Build and deployment -> Source: "GitHub Actions"**.
The site then lives at `https://<user>.github.io/<repo>/`, and every later push redeploys it.
The workflow also copies `index.html` to `404.html` so deep links survive a refresh.

Afterwards, set that URL as **Site URL** in Supabase (Authentication -> URL Configuration) so
password-reset links come back to the live site.

### Any other static host
`npm run build` produces a static site in `dist/`. Upload that folder to Netlify, Vercel,
Cloudflare Pages, Hostinger, cPanel or anything else. `vite.config.js` uses `base: './'`,
so it works from a sub-folder too.

## Backend: Supabase

Accounts, quiz attempts, the public leaderboard and admin question edits live in Supabase
(project **Quizs Project**, region `ap-south-1`). Schema + row-level-security policies: `supabase/schema.sql`.

- `.env` holds `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and **is committed on purpose**, so a
  clone of this repo talks to the live backend with no setup. Both values are public by design: Vite
  inlines them into the bundle every visitor downloads, and row-level security in the database is what
  actually protects the data. Never add the `service_role` key or the database password — those bypass
  RLS. To point the app at your own Supabase project, edit `.env` (or copy `.env.example`). With the
  vars empty the app falls back to browser-local storage (`src/backend/local.js`), which is what
  `npm run build:demo` produces.
- **Auth**: one section for everyone (`src/components/Auth.jsx`) - log in, sign up and reset a
  forgotten password in the same card, rendered as a page at `#login` and as a modal for mid-flow
  prompts. There is no separate admin login and the page never mentions admin: the account's own role
  decides where a login lands (admin -> admin panel, student -> dashboard).
  Sign-up goes through the `signup` Edge Function
  (`supabase/functions/signup`), which creates the account **already confirmed** — no confirmation
  email, so Supabase's 2-emails/hour mailer limit never blocks sign-ups. A `profiles` row is created
  automatically (trigger). Signing up with **Admin** + the invite code creates an admin account.
- **Becoming an admin** - there are no invite codes. Sign-up always creates a student, and the role is
  set in the database:
  - the **first account on a fresh install becomes the admin** (the `handle_new_user` trigger checks
    whether any profile exists yet);
  - after that an admin promotes anyone from **Admin -> Students -> Make admin**, which calls
    `set_user_role()`. That function refuses to demote you or the last remaining admin, so the site
    can never lock itself out. Passing `role: "admin"` to the sign-up API is ignored.
  - lost every admin? Run once in the SQL editor:
    `update public.profiles set role='admin' where id = (select id from auth.users where email='you@example.com');`
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
   ├─ Dashboard.jsx      student dashboard (login required)
   ├─ Admin.jsx          admin panel: overview, attempts, questions, students, analytics, profile, settings
   ├─ Account.jsx        account settings: display name, change password, log out
   ├─ Auth.jsx           unified log in / sign up / forgot password (page + modal)
   ├─ Duel.jsx           live 1v1 duel: lobby, waiting room, round, result
   └─ ui.jsx             shared components (modals, badges, toasts)
supabase/schema.sql      database schema, trigger, RLS policies, duel tables + functions
```

Leaderboard scoring: 10 points per correct answer, +50 when a quiz is finished in under half its time limit.
Anyone can play as a guest — no account needed. Guest scores stay in that browser (`qa_guest_attempts`)
and are not ranked. When a guest signs up or logs in, their guest scores are uploaded to the account
automatically, so the leaderboard only ever shows real accounts. The dashboard itself needs an account:
a guest opening `#dashboard` gets the login page, which says how many browser-held scores will be
carried over.

## Admin Dashboard (`#admin`)

```
LOGIN / SIGN UP  ->  Supabase Auth  ->  check profiles.role (enforced by RLS)
                                          |
                        student ----------+---------- admin
                          |                             |
                  Student Dashboard              Admin Dashboard
                    (#dashboard)                   |-- Overview    site totals + recent activity
                                                   |-- Attempts    every submission, search + CSV export
                                                   |-- Questions   add / remove / reset per quiz
                                                   |-- Students    directory with emails and per-student detail
                                                   |-- Analytics   14-day activity, per-quiz averages, top performers
                                                   \-- Profile     display name + change password
```

On phones the panel stays usable: the tab strip scrolls horizontally on its own, the Attempts and
Students tables become one labelled card per row (no sideways scrolling to read a record), toolbars
stack, and the KPI grids drop to two columns. Desktop keeps the real tables.

Analytics stands in for a shop's "revenue" board: attempts, weekly activity, active students,
average score, participation and points awarded. Students shows every account with **Make admin** / **Remove admin** and a **Delete** button that
removes the account along with its attempts and duels. The database refuses to delete your own
account or the last remaining admin, and refuses the call entirely for non-admins. Profile reuses the same two forms as the `#account` page, which students still use.

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
