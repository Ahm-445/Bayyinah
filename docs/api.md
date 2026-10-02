# Bayyinah – API & Integration Contract

Owner: Backend. Status: **draft v0.1 – for team agreement (2 Oct 2026)**.
Anyone who needs a change to this file opens a PR and tags the Backend owner.

This file has two parts:

1. **AI ↔ Backend contract**: how the Backend calls the AI module (based on the code already in `server/src/modules/ai`).
2. **REST API**: what the Frontend calls.

---

## Part 1 – AI ↔ Backend contract

### 1.1 The single entry point

The Backend only ever calls one function:

```js
const result = await orchestrator.processQuestion({ questionId, text, language });
```

- `orchestrator` is created by `createAIOrchestrator(...)` in `ai/orchestrator/aiOrchestrator.js`.
- `questionId` is the Backend question `_id` as a **string**. `language` is a string such as `"en"` / `"ar"`.
- The Backend never touches classifier / retriever / generator / verifier directly.

### 1.2 What it returns (`AIResult`)

Defined by `ai/contracts/aiResultContract.js` and `aiTypes.js`. The Backend relies on exactly these fields:

```jsonc
{
  "action": "ANSWER | CLARIFY | ABSTAIN | REFER",
  "classification": {
    "category": "aqeedah",              // QUESTION_CATEGORIES
    "level": "A | B | C | D",
    "risk": "low | medium | high",
    "action": "ANSWER",
    "reasons": ["..."]
  },
  "safety": { "decision": "ALLOW | REVIEW | BLOCK", "reason": "..." },
  "evidence": [
    {
      "sourceId": "quranpedia-quran-hafs",
      "chunkId": "...",                 // string, NOT an ObjectId
      "text": "...",
      "score": 0.87,                    // 0..1, relevance only
      "citation": { "sourceTitle": "...", "reference": "..." }
    }
  ],
  "draft": {                            // null when action is REFER / ABSTAIN-before-generation
    "answer": "...",
    "language": "en",
    "citations": [{ "sourceId": "...", "chunkId": "...", "sourceTitle": "...", "reference": "..." }]
  },
  "verification": {                     // null when no draft was generated
    "status": "PASS | NEEDS_REVIEW | FAIL",
    "citationValid": true,
    "evidenceSupported": true,
    "unsupportedClaims": [],
    "missingCitations": [],
    "riskFlags": [],
    "warnings": []
  }
}
```

### 1.3 How the Backend interprets the result

| AI result | Question status | Draft status | Dāʿī can approve? |
|---|---|---|---|
| `action = ANSWER`, `verification.status = PASS` | `awaiting_review` | `in_review` | Yes |
| `action = ANSWER`, `NEEDS_REVIEW` or `safety.decision = REVIEW` | `awaiting_review` | `in_review` | Yes, only with `acknowledgeWarnings: true` |
| `action = ABSTAIN` (insufficient evidence, or citation / evidence verification `FAIL`) | `awaiting_review` | `blocked` | No |
| `action = REFER` (level D / high risk) | `referred` | `blocked` | No |
| `processQuestion` throws | `failed` | none | n/a |

Rows are evaluated top to bottom on `action` first: an `ABSTAIN` result is always `blocked`, even though the orchestrator sets `safety.decision = REVIEW` for insufficient evidence.

Rule from the project plan: **nothing becomes public without dāʿī approval**, and an unverified draft is never publishable.

### 1.4 Who owns what in MongoDB

Same database (`MONGODB_DB_NAME`, default `bayyinah`), two connections (AI uses the native `mongodb` driver, Backend uses Mongoose). The Backend passes `dbName` to Mongoose explicitly, so both always use the same database regardless of the connection string.

| Collection | Owner | Notes |
|---|---|---|
| `knowledge_chunks` | **AI** | Backend never writes to it. IDs are strings (`chunkId`, `sourceId`). |
| `sources` (registry) | **Backend** | One document per `sourceId` string (e.g. `quranpedia-quran-hafs`). Has `active`, `usageBasis`. |
| `users`, `questions`, `drafts`, `answers`, `selections`, `scores`, `audit_logs` | **Backend** | `drafts` stores a **snapshot** of `evidence`, `citations` and `verification` as embedded objects (string ids), so a published answer stays traceable even if chunks are re-ingested. |

### 1.5 Integration setup (already done by the Backend)

Nothing here needs the AI owner, **as long as the AI module keeps the same public functions** (`createAIOrchestrator`, `processQuestion` and its result shape). If those change, update this file in the same PR.

1. **Wiring**: `server/src/modules/ai/index.js` (new file, no existing AI file was modified) exports `getOrchestrator()` and `closeAI()`. It builds the same composition as `orchestrator/realOrchestrator.test.js` (Mongo, Voyage, Gemini, retriever with `topK: 3`, draft generator, citation + evidence verifiers). The orchestrator is created once on first use; a failed attempt is not cached.
2. **Errors**: `processQuestion` and `getOrchestrator()` throw on failure (missing env, Mongo down, provider error). The Backend catches this and sets `question.status = failed`.
3. **Source registry**: `data/source-registry.json` holds `quranpedia-quran-hafs` and `quranpedia-tafsir-book-1`, copied from the chunk builders. The `usageBasis` of the tafsir entry is marked **TO CONFIRM** (see open items).
4. **Dependencies**: `@google/genai` and `mongodb` are now in `server/package.json` (Voyage is called with `fetch`, no SDK). The root `package.json` still lists `@google/genai`; it is harmless but can be removed.
5. **Env vars** (keep names stable): `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, `VOYAGE_API_KEY`, optional `VOYAGE_EMBEDDING_MODEL`, `GEMINI_MODEL`. The file is `server/.env`, loaded by the Backend config before the AI module is used. `ai/index.js` does not load dotenv itself.

**Open items (not blocking, later):**

- Retriever should skip chunks of sources with `active = false` in the registry (admin toggle, US-12).
- `runEvaluation()` entry point for `POST /api/evaluation/run`.
- Confirm the licence / approval basis of the tafsir source (`تيسير التفسير`) before it appears in the public demo.

---

## Part 2 – REST API (Frontend ↔ Backend)

### 2.1 Conventions

- Base path `/api`. JSON only. Dates are ISO-8601 strings. IDs are strings.
- **Errors** always look like `{ "error": "human readable message", "code": "optional_machine_code" }` with the proper HTTP status (400, 401, 403, 404, 409, 422, 500).
- **Questioner (anonymous)**: the Frontend generates a UUID once, keeps it in `localStorage`, and sends it as `X-Session-Id` on every public request.
- **Dāʿī / admin**: `POST /api/auth/login`, then send `Authorization: Bearer <token>`.
- CORS allows `CLIENT_ORIGIN` only.
- In production, `500` responses carry a generic message. Messages of `4xx` errors are safe to show to the user.

### 2.2 Enums the UI needs

| Field | Values |
|---|---|
| `question.status` | `submitted`, `drafting`, `awaiting_review`, `answered`, `referred`, `failed` |
| `draft.status` | `in_review`, `approved`, `rejected`, `blocked` |
| `verification.status` | `PASS` → badge **Verified**, `NEEDS_REVIEW` → **Needs Review**, `FAIL` → **Insufficient Evidence** |
| `classification.level` | `A`, `B`, `C`, `D` |
| `user.role` | `questioner`, `daee`, `admin` |

### 2.3 Endpoints

#### System

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | `{ status, db, uptime }`. Returns `503` with `status: "degraded"` when MongoDB is not connected. |

#### Auth

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/api/auth/login` | none | `{ email, password }` → `{ token, user: { id, displayName, role } }` |
| GET | `/api/auth/me` | any logged-in | → `{ id, displayName, role }` |

Accounts are created by the seed script (no public sign-up).

#### Questioner

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/api/questions` | `X-Session-Id` | `{ text, language }` → **201** `{ id, status: "submitted" }`. `text` 1–2000 chars. The AI runs **in the background**; the request does not wait for it. |
| GET | `/api/questions/:id` | `X-Session-Id` (owner) | → `{ id, text, language, status, classification: { category, level }, createdAt }`. **The Frontend polls this every 2–3 s** until `status` leaves `submitted` / `drafting`. |
| GET | `/api/questions/:id/answers` | `X-Session-Id` | → `{ selectedAnswerId: string \| null, answers: Answer[] }`, published answers only |
| POST | `/api/answers/:id/select` | `X-Session-Id` | → **201** `{ selected: true }`. **409** `already_selected` if this session already chose an answer for that question. **404** if the answer is not published. |

`Answer` (public shape):

```jsonc
{
  "id": "…",
  "daee": { "id": "…", "displayName": "…" },
  "finalText": "…",
  "citations": [{ "sourceId": "…", "chunkId": "…", "sourceTitle": "…", "reference": "…" }],
  "verificationStatus": "PASS | NEEDS_REVIEW | FAIL",
  "aiAssisted": true,
  "publishedAt": "…"
}
```

Questions in `referred` / `failed` status show the user a referral / error message; there are no answers to compare.

#### Dāʿī (role `daee` or `admin`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/daee/dashboard` | `{ stats: { pending, approved, rejected, referred, score }, queue: [{ draftId, questionId, questionText, level, verificationStatus, status, createdAt }] }` |
| GET | `/api/drafts/:id` | Full draft (shape below) |
| PATCH | `/api/drafts/:id` | `{ text }` → saves a new version, returns the draft. **409** if already approved / rejected. |
| POST | `/api/drafts/:id/approve` | `{ acknowledgeWarnings?: boolean }` → publishes the answer, returns `{ answerId }`. **422** `blocked` if the draft is blocked, **422** `warnings_not_acknowledged` if required (see 1.3). |
| POST | `/api/drafts/:id/reject` | `{ reason }` → `{ status: "rejected" }` |

Each assigned dāʿī gets **their own copy** of the AI draft and edits only that copy. In the MVP every active dāʿī is assigned every question.

`Draft` (dāʿī view):

```jsonc
{
  "id": "…",
  "status": "in_review",
  "question": { "id": "…", "text": "…", "language": "en", "classification": { "category": "…", "level": "A", "risk": "low" } },
  "aiAction": "ANSWER",
  "safety": { "decision": "ALLOW", "reason": "…" },
  "generatedText": "…",          // original AI output, never changes
  "text": "…",                    // current version being edited
  "versions": [{ "text": "…", "editedAt": "…" }],
  "evidence": [ /* same shape as 1.2 */ ],
  "citations": [ /* same shape as 1.2 */ ],
  "verification": { /* same shape as 1.2, or null */ },
  "requiresAcknowledgement": false
}
```

#### Sources and evidence

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/sources/:sourceId` | any | Registry entry: `{ sourceId, title, domain, url, authorityLevel, usageBasis, active }` (for the evidence card) |
| GET | `/api/sources` | admin | List the registry |
| PATCH | `/api/sources/:sourceId` | admin | `{ active }` – enable / disable a source |

#### Admin / evaluation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/evaluation/run` | Runs the fixed challenge test set, returns the report (depends on the `runEvaluation()` open item in 1.5) |

### 2.4 Scoring (backend only, no endpoint)

On every `select`, the Backend recalculates the score of that answer deterministically (selection points + evidence-quality points from `verification`; ineligible if safety failed) and stores the breakdown. The dāʿī sees the total in `dashboard.stats.score`. The score is never produced by an LLM.

### 2.5 Mock for the Frontend

Until the Backend is deployed, the Frontend can mock these responses with the shapes above. Any change to a shape goes through a PR on this file first.
