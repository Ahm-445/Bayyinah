# Bayyinah client

React + Vite frontend for Bayyinah. Questioners ask questions and compare the answers that dāʿīs
have reviewed and approved; dāʿīs review AI drafts in a work queue.

## Run

```bash
cd client
npm install
cp .env.example .env.local   # mock API on by default
npm run dev                  # http://localhost:5173
```

`npm run build` must pass before pushing (`main` must stay demoable). `npm run lint` checks style.

## Mock API vs real backend

| Variable | Meaning |
|---|---|
| `VITE_USE_MOCKS=true` | In-browser mock of the API (`src/services/mocks`). No backend needed. |
| `VITE_USE_MOCKS=false` | Calls the real backend at `VITE_API_BASE_URL` (default `/api`). |
| `VITE_API_PROXY_TARGET` | Where the dev server proxies `/api` (default `http://localhost:5000`). |

All requests go through `src/services/transport.js`, which picks the mock or the real API. The mock
keeps its data in `localStorage`, so it survives reloads and is shared between tabs. The amber
**Mock API · reset** button in the header restores the seed data and signs you out.

## Deploy (static hosting)

Build with the real API and the backend's **full** URL. A static host has no `/api` proxy:

```bash
VITE_USE_MOCKS=false VITE_API_BASE_URL=https://<backend>/api npm run build   # output in dist/
```

On Netlify or Cloudflare Pages, set the same two variables in the site's environment settings,
use build command `npm run build` and publish directory `dist` (base directory `client`).
Variables set by the host or the shell override `.env.local`, so a local mock setting cannot
leak into a deploy. The build prints a `[bayyinah]` warning if `VITE_API_BASE_URL` is not a
full URL or if mocks are on.

- **SPA fallback:** `public/_redirects` (`/* /index.html 200`) is copied to `dist/`, so
  refreshing any route (`/daee/drafts/…`, `/questions/…`) serves the app. Netlify needs this
  file. Cloudflare Pages also serves `index.html` for unknown paths on its own when there is no
  `404.html`, so the file is harmless there.
- **No mock code in production:** with `VITE_USE_MOCKS=false` the build contains no mock
  adapter, demo accounts or passwords, "Mock API · reset" button or mock login hint (each is
  behind an inline `import.meta.env.VITE_USE_MOCKS === 'true'` check that the build removes).
- **Backend:** add the site's origin to the server's `CLIENT_ORIGIN` (comma separated), since the
  browser now calls the backend cross-origin.

## Mock accounts

All passwords are `demo1234`. Sign in at `/login`; you are sent to the dashboard for your role.

| Username | Role | Notes |
|---|---|---|
| `sara` | questioner | Owns the seeded questions, including one with two answers to compare |
| `john` | questioner | No questions; use it to check that questions are private to their owner |
| `khalid` | dāʿī | Ustadh Khalid: queue with every review scenario |
| `maryam` | dāʿī | Ustadha Maryam: second dāʿī with her own draft copies |
| `admin` | admin | Dāʿī screens plus `/admin/eval` |

New questioner accounts can be created at `/register`. Dāʿī accounts are seeded only.

## Screens

| Path | Who | What |
|---|---|---|
| `/login`, `/register` | everyone / questioners | One sign-in page for all roles; sign-up for questioners |
| `/ask` | questioner | Ask box, with "Your questions" sidebar |
| `/questions/:id` | questioner (owner only) | Status, then the approved answers: compare and select one |
| `/daee` | dāʿī, admin | Work queue and stats |
| `/daee/drafts/:id` | dāʿī, admin | Review: edit the AI draft, evidence panel, approve or reject |

## Languages (English / Arabic)

- All UI strings live in `src/i18n/en.js` and `src/i18n/ar.js` (same keys). Use
  `const { t } = useI18n()` and `t('section.key', { param })`. Count keys use plural forms
  (`one`/`other`, and Arabic `zero`/`one`/`two`/`few`/`many`/`other`).
- The header toggle saves the choice in `localStorage` (`bayyinah.lang`). Without a choice, dāʿī
  and admin pages open in Arabic and everything else in English.
- Arabic sets `<html lang="ar" dir="rtl">`. Use logical Tailwind classes (`ms-`/`me-`, `ps-`/`pe-`,
  `start`/`end`, `text-start`) so layouts mirror; never `ml-`/`pl-`/`left-`/`text-left`.
- Fonts: IBM Plex Sans Arabic for Arabic UI text, Amiri (`font-quran`) for Qur'an text only.
- Only the UI is translated. Questions, answers, AI drafts and backend messages keep their own
  language and render with `dir="auto"`. "Insert citation" follows the question's language:
  `(الذاريات 51:56)` for Arabic questions, `(Adh-Dhariyat 51:56)` for English ones.

## Pending backend confirmation

The mock follows `docs/api.md` plus the team decision of 3 Oct 2026. These parts are not in
`docs/api.md` yet and may change:

- `POST /api/auth/register` and `POST /api/auth/login` with `{ username, password }`, returning
  `{ token, user: { id, username, displayName, role } }`. Register returns `409 username_taken`.
- Every questioner endpoint needs a questioner token (no `X-Session-Id`). A question and its answers
  are visible only to the account that asked it (others get `404`), and only that account can select
  an answer.
- `GET /api/questions` returns the signed-in questioner's questions: `{ questions: Question[] }`.
- **The AI never blocks the dāʿī** (decided product rule; backend to align). Verification is
  advisory: there is no `422 blocked`. When the AI could not draft (insufficient evidence or
  unclear question), verification failed, or the question is Level D, the dāʿī can still write or
  edit and approve, after ticking "I have reviewed this answer and take responsibility for it". The
  client sends this as `acknowledgeWarnings: true` (the existing field); without it the mock
  returns `422 warnings_not_acknowledged`. Approving empty text returns `400`.
- Level D shows the referral notice with a "Write an answer anyway" option behind a strong warning.
  It can be switched off with `ALLOW_LEVEL_D_OVERRIDE` in `src/shared/lib/enums.js`.
- Queue items may include `aiAction` (the mock sends it) so the queue can label "AI couldn't
  draft", "Verification failed" and "Unclear question" exactly. Without it the client derives the
  label from `status` and `verificationStatus`.
- **Scoring (proposed, pending team agreement):** +1 point to a dāʿī for each answer they publish,
  +10 when a questioner selects their answer. The score is recomputed from the data, never stored.
  The values live only in the mock, in `src/services/mocks/scoring.js`; the client just shows
  `dashboard.stats.score`.

Questioners never see sources lists or verification status. Dāʿīs mention sources inside the answer
text; "Insert citation" adds a readable reference such as `(Adh-Dhariyat 51:56)`.
