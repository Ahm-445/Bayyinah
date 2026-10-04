# Bayyinah – API & Integration Contract

Owner: Backend. Status: **v1.0, implemented** in `server/` and covered by `server/tests/api.test.js` (27 integration tests against a real MongoDB).
It replaces the earlier draft: questioners now have **accounts** (no `X-Session-Id`), and the Frontend's mock (`client/src/services/mocks/adapter.js`) matches this file.
A change to a shape goes through a PR on this file first.

Contents: 1. Conventions · 2. Enums · 3. Endpoints (with real examples) · 4. Behaviour rules · 5. AI ↔ Backend · 6. Data ownership · 7. Decisions and open items · 8. Running it

---

## 1. Conventions

- Base path `/api`. JSON only. Dates are ISO-8601 strings. Ids are strings (24-hex).
- **Auth**: `Authorization: Bearer <token>` from login/register (JWT, 7 days). Missing/invalid token → `401`; wrong role → `403`.
- **Errors**: `{ "error": "message", "code": "optional_machine_code" }`.
  Messages of `4xx` errors are safe to show to the user. In production `5xx` carry a generic message.
  Codes in use: `username_taken` (409), `already_selected` (409), `warnings_not_acknowledged` (422), `invalid_json` (400), `not_found` (404).
- Someone else's question, answer or draft is always `404`, never `403`, so ids cannot be probed.
- CORS allows the origins in `CLIENT_ORIGIN` (comma separated).
- `POST /questions` returns immediately; the AI runs in the background. **The Frontend polls `GET /questions/:id` every 2–3 s** until `status` is neither `submitted` nor `drafting`.

## 2. Enums

| Field | Values |
|---|---|
| `user.role` | `questioner`, `daee`, `admin` |
| `question.status` | `submitted` → `drafting` → `awaiting_review` \| `referred` \| `failed` → `answered` |
| `draft.status` | `in_review`, `approved`, `rejected` (`blocked` exists but is no longer produced: the AI never blocks the dāʿī) |
| `aiAction` | `ANSWER`, `CLARIFY`, `ABSTAIN`, `REFER` |
| `verification.status` | `PASS`, `NEEDS_REVIEW`, `FAIL` |
| `safety.decision` | `ALLOW`, `REVIEW`, `BLOCK` |
| `classification.level` | `A`, `B`, `C`, `D` |

## 3. Endpoints

### System

`GET /api/health` → `200 {"status":"ok","db":"connected","ai":"mock","uptime":6}`. `503` with `"status":"degraded"` if MongoDB is down. `ai` is `real`, `mock` or `custom`.

### Accounts

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ username, password }` | `201 { token, user }`. Questioners only. Username 3–32 chars `[A-Za-z0-9_.-]`, password 8–128. `400` invalid, `409 username_taken` (case-insensitive). |
| POST | `/auth/login` | `{ username, password }` | `{ token, user }` (all roles, username case-insensitive). `401` otherwise. |
| GET | `/auth/me` | – | `user` |

```json
{ "token": "eyJhbGciOi…", "user": { "id": "6ac21cd4…", "username": "sara", "displayName": "sara", "role": "questioner" } }
```

Dāʿī and admin accounts are created by the seed script (section 8).

### Questioner (role `questioner`; only the owner can read a question)

| Method | Path | Notes |
|---|---|---|
| POST | `/questions` | `{ text, language }` – text 1–2000 chars, language `"ar"` or `"en"` (default `en`). → `201 { id, status: "submitted" }` |
| GET | `/questions` | → `{ questions: Question[] }`, newest first, own questions only |
| GET | `/questions/:id` | → `Question`. `404` for anyone but the owner. |
| GET | `/questions/:id/answers` | → `{ selectedAnswerId, answers: Answer[] }`, oldest first |
| POST | `/answers/:id/select` | → `201 { selected: true }`. One selection per question. `409 already_selected`; `404` if not the owner or unknown. |

```json
// Question
{ "id": "6ac21cec…", "text": "ما معنى التوحيد؟", "language": "ar", "status": "awaiting_review",
  "classification": { "category": "aqeedah", "level": "A", "risk": "low", "action": "ANSWER", "language": "ar", "reasons": [] }, "createdAt": "2026-10-04T09:31:24.998Z" }
// classification is null until the AI has finished

// Answer (what the questioner sees: no verification, no evidence list, no AI details)
{ "id": "6ac21cf3…", "daee": { "id": "6ac21cd4…", "displayName": "Ustadh Khalid" },
  "finalText": "…(Al-Ikhlas 112:1).", "citations": [], "publishedAt": "2026-10-04T09:31:31.150Z" }
```

A question in status `referred` (level D) or `failed` has no answers until a dāʿī answers (referred) or never (failed).

### Dāʿī (role `daee` or `admin`; a dāʿī sees only their own drafts, an admin sees all)

| Method | Path | Notes |
|---|---|---|
| GET | `/daee/dashboard` | stats + queue (below) |
| GET | `/drafts/:id` | full `Draft` |
| PATCH | `/drafts/:id` | `{ text }` → saves a new version, returns the draft. `400` empty, `409` if already approved/rejected. |
| POST | `/drafts/:id/approve` | `{ acknowledgeWarnings?, text? }` → `{ answerId }`. See 4. `422 warnings_not_acknowledged`, `400` empty text, `409` already closed. |
| POST | `/drafts/:id/reject` | `{ reason }` (required) → `{ status: "rejected" }`. `409` if already closed. |

```json
// GET /daee/dashboard
{ "stats": { "pending": 1, "approved": 0, "rejected": 0, "referred": 0, "score": 0,
             "scoreBreakdown": { "published": 0, "selected": 0, "publishedPoints": 0, "selectedPoints": 0 } },
  "queue": [ { "draftId": "6ac21cee…", "questionId": "6ac21cec…", "questionText": "…", "level": "A",
               "aiAction": "ANSWER", "verificationStatus": "PASS", "status": "in_review",
               "createdAt": "2026-10-04T09:31:26.858Z" } ] }
```

`pending` always equals the queue length. `referred` counts drafts whose `aiAction` is `REFER`. `verificationStatus` is `null` when the AI produced no draft.

```json
// GET /drafts/:id
{ "id": "6ac21cee…", "status": "in_review",
  "question": { "id": "6ac21cec…", "text": "…", "language": "ar",
                "classification": { "category": "aqeedah", "level": "A", "risk": "low" } },
  "aiAction": "ANSWER",
  "action": "ANSWER",
  "aiResult": { "action": "ANSWER", "classification": { "category": "aqeedah", "level": "A", "risk": "low", "action": "ANSWER", "language": "ar", "reasons": [] }, "safety": {}, "evidence": [], "draft": {}, "verification": {} },
  "clarificationQuestion": null,
  "safety": { "decision": "ALLOW", "reason": "…" },
  "generatedText": "…",              // original AI output, never changes; null when the AI wrote no draft
  "text": "…",                        // the dāʿī's current text ("" when there is no AI draft)
  "versions": [ { "text": "…", "editedAt": "…", "editedBy": null } ],
  "evidence": [ { "sourceId": "quranpedia-quran-hafs", "chunkId": "quran-hafs-51-56", "text": "…", "score": 0.91,
                  "citation": { "sourceTitle": "…", "reference": "…", "sourceType": "quran", "language": "ar",
                                "surahNumber": 51, "ayahNumber": 56 } } ],
  "citations": [ { "sourceId": "…", "chunkId": "…", "sourceTitle": "…", "reference": "…" } ],
  "verification": { "status": "PASS", "citationValid": true, "evidenceSupported": true,
                    "unsupportedClaims": [], "missingCitations": [], "riskFlags": [], "warnings": [] },
  "requiresAcknowledgement": false,
  "pipeline": [ { "stage": "classification", "status": "done" }, { "stage": "safety", "status": "done" },
                { "stage": "retrieval", "status": "done" }, { "stage": "generation", "status": "done" },
                { "stage": "verification", "status": "done" } ] }
```

`verification` is `null` when no draft exists. `pipeline` shows which stages ran (`done`, `warning`, `failed`, `skipped`); it has no timings because the AI module does not report them.

### Sources

| Method | Path | Notes |
|---|---|---|
| GET | `/sources/:sourceId` | any signed-in user → `{ sourceId, title, domain, url, author, authorityLevel, language, version, license, usageBasis, active }` |
| GET | `/sources` | admin → `{ sources: [...] }` |
| PATCH | `/sources/:sourceId` | admin, `{ active: boolean }` |

## 4. Behaviour rules

- **One draft per dāʿī.** When the AI finishes, every `daee` account gets its own copy of the result. Publishing creates an answer under that dāʿī's name; the other dāʿīs' drafts stay in their queues. The dāʿī who answered no longer sees it. (MVP: every dāʿī gets every question.)
- **The AI never blocks the dāʿī.** `REFER`, `ABSTAIN` and `CLARIFY` results are saved in the queue, with `generatedText: null` and an empty `text`. The dāʿī may write an answer.
- **Responsibility check.** `requiresAcknowledgement` is `true` when `aiAction` is not `ANSWER`, the level is `D`, `safety.decision` is not `ALLOW`, verification is missing or not `PASS`, or it has warnings / risk flags. `NEEDS_REVIEW` can be published only with `acknowledgeWarnings: true` (exactly the boolean). `FAIL` can never be published, even with acknowledgement (`422 verification_failed`).
- **`approve` accepts the final `text`** in the same request (saved as a version, then published), so the Frontend can save and publish in one call. Without `text` it publishes the current draft text.
- **Sources come from the final text**, not from the AI draft. A verse is cited when its number appears as `surah:ayah` (`51:56`, not `151:56` or `51:567`), whatever the surah name or language; other sources are cited when their `reference` appears (e.g. `Sahih al-Bukhari 1`). Only cited evidence ends up in `answer.citations`.
- `answer.citations` is presentation metadata derived from the final text and the AI-provided evidence list. It does not establish that a source supports a claim. The full evidence and verification snapshot remains on the draft in `aiResult`, `evidence`, and `verification`.
- **Publishing is atomic.** A double click or two tabs give one `200` and one `409`.
- **Ownership.** A question belongs to the account that asked it. Only the owner reads its answers and selects one.
- **Scoring** (computed on every read, never stored, never by an LLM): **+1** per published answer, **+10** each time the dāʿī's answer is selected. `stats.score` is the total; `scoreBreakdown` explains it.
- **Audit.** `question.create`, `draft.approve`, `draft.reject`, `answer.select`, `source.setActive` and logins are written to `app_audit_logs`.

## 5. AI ↔ Backend

The Backend calls one function: `processQuestion({ questionId, text, language })` from `server/src/modules/ai` (AI owner). It must **throw** on failure. The backend snapshot retains the complete result (including `classification.action`, `classification.language`, and `classification.reasons`) in `draft.aiResult`; normalized aliases such as `aiAction` are additional fields and do not replace the source values.

It returns an `AIResult` (`ai/contracts/aiResultContract.js`): `{ action | aiAction, classification, safety, evidence[], draft | null, verification | null }`.
The Backend relies on exactly these fields and passes them through unchanged (see the `Draft` example above):

- `classification`: the complete object, including `category`, `level`, `risk`, `action`, `language`, and `reasons`; it is stored unchanged in the question and draft snapshot
- `safety`: `decision`, `reason`
- `evidence[]`: `sourceId`, `chunkId`, `text`, `score`, and `citation` with `sourceTitle`, `reference`, `sourceType`, `language`, `surahNumber`, `ayahNumber` (fields found on the item itself are lifted into `citation`)
- `draft`: `answer`, `language`, `citations[]`
- `verification`: `status`, `citationValid`, `evidenceSupported`, `unsupportedClaims`, `missingCitations`, `riskFlags`, `warnings`

| AI result | Question status | Drafts |
|---|---|---|
| `ANSWER` / `ABSTAIN` / `CLARIFY` | `awaiting_review` | one per dāʿī, `in_review` |
| `REFER` | `referred` | one per dāʿī, `in_review` (answering needs acknowledgement) |
| throws, invalid result, or takes longer than `AI_TIMEOUT_MS` (90 s) | `failed` | none |

**Modes** (`AI_MODE`): `real` uses `modules/ai` (needs `VOYAGE_API_KEY` and `OPENAI_API_KEY`, or `GEMINI_API_KEY` with `LLM_PROVIDER=gemini`); `mock` returns clearly labelled canned results so the Frontend works without keys. Unset = `real` when the keys exist, otherwise `mock`. `GET /health` shows the active mode. `AI_MODE=real` without keys refuses to start.

Mock behaviour: a personal question (`my`, `should I`, `fatwa`, …) → `REFER`; an unrelated topic (`python`, `bitcoin`, …) → `ABSTAIN`; anything else → `ANSWER` with a Qur'an verse in the question's language, e.g. `(Al-Ikhlas 112:1)` / `(الإخلاص 112:1)`.

**For the AI owner**, nothing else is needed from you as long as `processQuestion` keeps this shape. Open items, not blocking:
- The retriever should skip chunks of sources that are `active: false` in the registry (admin toggle). Today the toggle only changes the registry.
- Optional: per-stage timings in the result (`pipeline[].ms`) would let the Frontend show them in the demo.

## 6. Data ownership (same database, `MONGODB_DB_NAME`)

The Backend passes `dbName` to Mongoose explicitly, so it and the AI module always use the same database.

| Collection | Owner |
|---|---|
| `knowledge_chunks` | **AI** (the Backend never writes it; the vector index lives there) |
| `app_users`, `app_questions`, `app_drafts`, `app_answers`, `app_selections`, `app_audit_logs`, `app_sources` | **Backend** |
| `questions`, `drafts` | the AI owner's earlier demo endpoints; unused by the Backend (hence the `app_` prefix) |

`app_drafts` stores a **snapshot** of evidence, citations and verification, so a published answer stays traceable even if chunks are re-ingested.
`app_sources` is seeded from `data/source-registry.json`, which was generated from the metadata of the ingested chunks (5 sources: Qur'an Hafs, Saheeh International translation, Taysir al-Tafsir, Sahih al-Bukhari, Sahih Muslim).

## 7. Decisions and open items

Decided in the Backend (change by PR on this file):

| Topic | Decision |
|---|---|
| Level D / `REFER` | The dāʿī may answer anyway, behind `acknowledgeWarnings`. The Frontend's `ALLOW_LEVEL_D_OVERRIDE` is on. To make it referral-only, answer `422` in `approve` when `aiAction` is `REFER`. |
| `CLARIFY` | The classifier does not emit it today. If received: question `awaiting_review`, draft without answer text, acknowledgement required. A supplied `clarificationQuestion` is stored and shown; the questioner sees `awaiting_review`. The backend does not invent this field or change the orchestrator. |
| Anonymous questioners | Not supported any more: questions belong to accounts. |
| Dāʿī accounts | Fixed, created by the seed script. No public sign-up for dāʿīs or admins. |
| Verification of final text | The AI verifies its own draft only. The dāʿī's edited text is not re-verified; the dāʿī takes responsibility. |

Not implemented: rate limiting on login/register, password reset, `POST /evaluation/run`, enforcing `active: false` inside retrieval. Ahmed's temporary endpoints (`/questions/:id/ai-answer`, `/review/drafts`, `/review/drafts/:id/decision`, `/questions/:id/published-answer`) are **not** part of this API.

## 8. Running it

```bash
cd server
npm install
cp ../.env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                   # dāʿī/admin accounts + source registry
npm run dev                    # http://localhost:5000, GET /api/health
npm test                       # integration tests; they use the throw-away DB "bayyinah_test" and drop it afterwards
```

Seeded accounts (`npm run seed`): `khalid`, `maryam` (dāʿī) and `admin`, all with the password `SEED_PASSWORD` from `.env` (`demo1234` outside production; required in production). Questioners register themselves. Demo data only.
Frontend: set `VITE_API_BASE_URL` to the server (e.g. `http://localhost:5000/api`) and `VITE_USE_MOCKS=false`; add the Frontend origin to `CLIENT_ORIGIN`.
