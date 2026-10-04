# Bayyinah – API & Integration Contract

Owner: Backend. Status: **draft v0.2 – for team agreement (4 Oct 2026)**.
Anyone who needs a change to this file opens a PR and tags the Backend owner.

This file has two parts:

1. **AI ↔ Backend contract**: how the Backend calls the AI module, what it returns, and the responsibilities of each AI layer (based on the code already in `server/src/modules/ai`).
2. **REST API**: what the Frontend calls.

---

## Part 1 – AI ↔ Backend contract

### 1.0 Module boundary

The AI module lives in `server/src/modules/ai`. It is a self-contained pipeline. The Backend only ever calls the public entry point; it never touches classifier / retriever / generator / verifier directly.

Division of responsibility:

- **Deterministic (no LLM):** classification, safety gate, evidence sufficiency, citation traceability, verification-status rules, all contracts.
- **LLM (Gemini):** draft generation and semantic evidence verification.
- **Embedding (Voyage):** query + document embeddings for retrieval and ingestion.

The AI module **never publishes**. It produces a draft plus a verification result. Publication always requires a Dāʿī review.

### 1.1 Public entry points (`server/src/modules/ai/index.js`)

The Backend imports one module and calls:

```js
const { getOrchestrator, closeAI } = require("../modules/ai");

const orchestrator = await getOrchestrator();      // created once, cached on success
const result = await orchestrator.processQuestion({ questionId, text, language });
// ...later, on shutdown:
await closeAI();                                    // closes the AI Mongo connection
```

- `getOrchestrator()` returns a promise for an object with `processQuestion`. It is created **once** and cached; a failed attempt is **not** cached, so the next call retries.
- `closeAI()` clears the cached orchestrator and closes the AI module's Mongo connection.

**Environment**: the caller (Backend config) must load `server/.env` **before** the AI module is used. `ai/index.js` does not load dotenv itself. Required: `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, `VOYAGE_API_KEY`. Optional: `GEMINI_MODEL` (default `gemini-3.1-flash-lite`), `VOYAGE_EMBEDDING_MODEL` (default `voyage-4-large`).

### 1.2 `processQuestion` input

| Field | Type | Notes |
|---|---|---|
| `questionId` | string | Backend question `_id`. Required. |
| `text` | string | The question (1–2000 chars). Required. |
| `language` | string | e.g. `"en"` / `"ar"`. Required. |

### 1.3 `AIResult` shape

Defined in `contracts/aiResultContract.js` (+ `aiTypes.js`). The Backend relies on exactly these fields:

```jsonc
{
  "action": "ANSWER | CLARIFY | ABSTAIN | REFER",
  "classification": {
    "category": "aqeedah",              // QUESTION_CATEGORIES
    "level": "A | B | C | D",           // QUESTION_LEVELS
    "risk": "low | medium | high",      // RISK_LEVELS
    "action": "ANSWER",                 // AI_ACTIONS (recommended action)
    "reasons": ["..."]
  },
  "safety": { "decision": "ALLOW | REVIEW | BLOCK", "reason": "..." },
  "evidence": [
    {
      "sourceId": "quranpedia-quran-hafs",
      "chunkId": "...",                 // string, NOT an ObjectId
      "text": "...",
      "score": 0.87,                    // 0..1, relevance to the query only
      "citation": { "sourceId": "...", "chunkId": "...", "reference": "..." }
    }
  ],
  "draft": {                            // null unless an answer was actually generated
    "answer": "...",
    "language": "en",                   // lowercased by the draft contract
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

Important guarantees:

- `evidence[].score` is **retrieval relevance** (0..1). It is **not** scholarly correctness. Never display it as a confidence/quality score.
- `chunkId` and `sourceId` are **strings**, not ObjectIds.
- `draft` and `verification` are `null` when no answer was generated (REFER, ABSTAIN-before-generation, or citation FAIL at step 7).

### 1.4 Pipeline (ordered) and stage responsibilities

`processQuestion` runs these stages in order.

| Step | Stage | Location | Responsibility | Notes |
|---|---|---|---|---|
| 1 | Classify | `classifier/*` | Deterministic: category, level (A/B/C/D), risk, recommended action, reasons. No LLM. | `classifyQuestion(text)`. Uses `textNormalizer`, `categoryDetector`, `levelDetector`, `riskDetector`, `actionDetector`, `classifierRules`, `categoryPriority`. |
| 2 | Safety | `safety/*` | Turn classification into `ALLOW / REVIEW / BLOCK` + reason. | `evaluateSafety(classification)`. |
| 3 | Gate | `safety/safetyDecisionHandler` | Decide whether to generate. `BLOCK` → stop, `action = REFER`. | `BLOCK` → `{action: REFER, shouldGenerate: false}`; `ALLOW` → `ANSWER, generate`; `REVIEW` → `ANSWER, generate, requiresReview`. |
| 4 | Retrieve | `rag/retrieval/*` | Vector search over `knowledge_chunks`. Returns evidence. | `retriever.retrieve(text)` → `vectorRetriever` → Mongo `$vectorSearch` on index `knowledge_chunks_vector_index`, path `embedding`, cosine, dims 1024. `topK = 3`. |
| 5 | Sufficiency | `rag/retrieval/evidenceSufficiency` | Stop if too little relevant evidence. | `checkEvidenceSufficiency(evidence)` default `minimumEvidence = 1`, `minimumScore = 0.7`. If insufficient → `ABSTAIN` (and safety is overridden to `REVIEW`). |
| 6 | Generate | `generator/*` | LLM writes a draft **from evidence only**. Never invents facts, sources, or citations. | `draftGenerator.generateDraft({question, language, evidence})`. Uses `generationPrompt`; `temperature = 0.2`. |
| 7 | Cite-check | `verifier/citationVerifier` | Every draft citation must map to a retrieved evidence key (`sourceId:chunkId`). Traceability only, not semantics. | If `FAIL` → `ABSTAIN` (draft returned but blocked). |
| 8 | Semantic verify | `verifier/*` | LLM judges whether the draft's claims are supported by the evidence. | `evidenceVerifier.verify({question, draft, evidence})` → `semanticVerificationProvider` (temperature `0`), `verificationResponseParser`, `verificationRules`. |
| 9 | Combine | `verifier/verificationCombiner` | Merge citation + evidence verification into one `VerificationResult`. | See 1.5. |
| 10 | Finalize | `orchestrator/aiOrchestrator` | Build the `AIResult`. | `action = verification.status === FAIL ? ABSTAIN : classification.action`. |

### 1.5 Verification rules (`verifier/verificationRules.js`)

`determineVerificationStatus` order of precedence:

1. `FAIL` if `!citationValid` OR `!evidenceSupported` OR `unsupportedClaims.length > 0` OR `missingCitations.length > 0`.
2. `NEEDS_REVIEW` if `riskFlags.length > 0` OR `warnings.length > 0`.
3. Otherwise `PASS`.

`PASS` only means the automated checks passed. It does **not** mean the Dāʿī should publish automatically.

### 1.6 How the Backend interprets the result

| AI result | Question status | Draft status | Dāʿī can approve? |
|---|---|---|---|
| `action = ANSWER`, `verification.status = PASS` | `awaiting_review` | `in_review` | Yes |
| `action = ANSWER`, `NEEDS_REVIEW` or `safety.decision = REVIEW` | `awaiting_review` | `in_review` | Yes, only with `acknowledgeWarnings: true` |
| `action = ABSTAIN` (insufficient evidence, or citation / evidence verification `FAIL`) | `awaiting_review` | `blocked` | No |
| `action = REFER` (level D / high risk) | `referred` | `blocked` | No |
| `processQuestion` throws | `failed` | none | n/a |

Rows are evaluated top to bottom on `action` first: an `ABSTAIN` result is always `blocked`, even when the orchestrator sets `safety.decision = REVIEW` for insufficient evidence.

Rule from the project plan: **nothing becomes public without Dāʿī approval**, and an unverified draft is never publishable.

### 1.7 Enumerations the rest of the system needs

Defined in `contracts/aiTypes.js` (application-level contracts, not Mongo schemas).

| Field | Values |
|---|---|
| `classification.level` | `A` (stable foundational), `B` (explanation/definition/reasoning), `C` (disputed / high-sensitivity), `D` (personal fatwa / individual case) |
| `classification.category` | `general_islam`, `quran`, `hadith`, `tafsir`, `aqeedah`, `fiqh`, `seerah_history`, `objections`, `terminology`, `translation`, `other` |
| `action` | `ANSWER`, `CLARIFY`, `ABSTAIN`, `REFER` |
| `risk` | `low`, `medium`, `high` |
| `safety.decision` | `ALLOW`, `REVIEW`, `BLOCK` |
| `verification.status` | `PASS`, `NEEDS_REVIEW`, `FAIL` |
| `user.role` | `questioner`, `daee`, `admin` |

### 1.8 Component responsibilities

**Classifier (`classifier/`)** — deterministic, no LLM. Given text it returns `{ category, level, risk, action, reasons }`: normalizes text (`textNormalizer`), detects category via keyword groups (ordered by `categoryPriority`), detects level A/B/C/D, derives risk and action from the level. `classificationPrompt.js` is currently unused (reserved).

**Safety (`safety/`)** — `evaluateSafety(classification)` → `{ decision, reason }`. Level D → `BLOCK`; level C → `REVIEW`; risk high or action `REFER` → `BLOCK`; else `ALLOW`. `handleSafetyDecision` maps a decision to `{ action, shouldGenerate, requiresReview, reason }`.

**Retriever (`rag/retrieval/`)** — `createRetriever({db, embeddingProvider, topK})` (topK=3 in the wiring). Vector search on `knowledge_chunks` (`$vectorSearch`, cosine, 1024 dims, index `knowledge_chunks_vector_index`, `numCandidates = max(topK*10, 50)`), returns evidence via `createEvidence`. `evidenceSufficiency` implements the minimum count / score gate.

**Ingestion & storage (`rag/ingestion`, `rag/storage`)** — builds the knowledge base. `mongoClient` connects with `MONGODB_URI` + `MONGODB_DB_NAME`; `chunkStore` upserts into `knowledge_chunks` by `chunkId`; `vectorIndex` creates the 1024-dim cosine index. `ingestionPipeline` validates a source (`sourceValidator`, `sourceContract` — rejects non-approved sources), chunks text (`textChunker`), and builds chunks (`chunkContract`). Quran/tafsir build scripts live in `rag/ingestion/{quran,tafsir}`.

**Embeddings (`rag/embeddings`, `providers/voyageEmbeddingProvider`)** — Voyage embedding model `voyage-4-large`, 1024 dims, via the MongoDB Atlas embeddings endpoint. `embeddingPipeline` orchestrates document/query embedding for ingestion and retrieval.

**Generator (`generator/`)** — `createDraftGenerator({llmProvider, model})` → `generateDraft({question, language, evidence})`. Builds the prompt from `generationPrompt`, calls the LLM (`temperature = 0.2`), then builds a draft with `citations` copied from the evidence (`sourceId`, `chunkId`, `sourceTitle`, `reference`). The draft is **not** a published answer.

**Verifier (`verifier/`)** — three layers:
- `citationVerifier` — for every `draft.citation`, confirms `sourceId:chunkId` exists in the retrieved evidence. Traceability only.
- `evidenceVerifierService` + `semanticVerificationProvider` + `verificationResponseParser` — sends draft + evidence to the LLM (temperature `0`) and parses `{ evidenceSupported, unsupportedClaims, warnings, riskFlags }`.
- `verificationCombiner` + `verificationRules` — merges citation + evidence checks into a single `status`.

**Providers (`providers/`)** — `geminiLLMProvider` wraps `@google/genai` (`DEFAULT_MODEL = gemini-3.1-flash-lite`); `llmProvider` and `embeddingProvider` are the contract adapters; `voyageEmbeddingProvider` issues the embedding calls.

**Contracts (`contracts/`)** — define the shared shapes: `aiTypes` (enums), `aiResultContract`, `classificationContract`, `evidenceContract`, `draftContract`, `verificationContract`, `questionContract`. These are the stable surface the Backend and the rest of the app depend on.

### 1.9 Who owns what in MongoDB

Same database (`MONGODB_DB_NAME`, default `bayyinah`), two connections (AI uses the native `mongodb` driver, Backend uses Mongoose). The Backend passes `dbName` to Mongoose explicitly, so both always use the same database regardless of the connection string.

| Collection | Owner | Notes |
|---|---|---|
| `knowledge_chunks` | **AI** | Backend never writes to it. IDs are strings (`chunkId`, `sourceId`). |
| `sources` (registry) | **Backend** | One document per `sourceId` string (e.g. `quranpedia-quran-hafs`). Has `active`, `usageBasis`. |
| `users`, `questions`, `drafts`, `answers`, `selections`, `scores`, `audit_logs` | **Backend** | `drafts` stores a **snapshot** of `evidence`, `citations` and `verification` as embedded objects (string ids), so a published answer stays traceable even if chunks are re-ingested. |

### 1.10 Integration setup (already done by the Backend)

Nothing here needs the AI owner, **as long as the AI module keeps the same public functions** (`createAIOrchestrator`, `processQuestion` and its result shape). If those change, update this file in the same PR.

1. **Wiring**: `server/src/modules/ai/index.js` (new file, no existing AI file was modified) exports `getOrchestrator()` and `closeAI()`. It builds the same composition as `orchestrator/realOrchestrator.test.js` (Mongo, Voyage, Gemini, retriever with `topK: 3`, draft generator, citation + evidence verifiers).
2. **Errors**: `processQuestion` and `getOrchestrator()` throw on failure (missing env, Mongo down, provider error). The Backend catches this and sets `question.status = failed`.
3. **Source registry**: `data/source-registry.json` holds `quranpedia-quran-hafs` and `quranpedia-tafsir-book-1`, copied from the chunk builders. The `usageBasis` of the tafsir entry is marked **TO CONFIRM** (see open items).
4. **Dependencies**: `@google/genai` and `mongodb` are now in `server/package.json` (Voyage is called with `fetch`, no SDK). The root `package.json` still lists `@google/genai`; it is harmless but can be removed.
5. **Env vars** (keep names stable): `MONGODB_URI`, `MONGODB_DB_NAME`, `GEMINI_API_KEY`, `VOYAGE_API_KEY`, optional `VOYAGE_EMBEDDING_MODEL`, `GEMINI_MODEL`. The file is `server/.env`, loaded by the Backend config before the AI module is used. `ai/index.js` does not load dotenv itself.

### 1.11 Tests

The AI module has a test-first suite. Notable specs:

- Orchestrator: `orchestrator/orchestrator.test.js`, `realOrchestrator.test.js`, `quranRealOrchestrator.test.js`, `citationFailure.test.js`, `insufficientEvidence.test.js`, `unsupportedClaim.test.js`, `review.test.js`, `safety.test.js`, `realRetrieval.test.js`, `quranFailureCases.test.js`.
- RAG: `rag/retrieval/retriever.test.js`, `vectorRetriever.test.js`, `quranVectorSearch.test.js`, `quranFullVectorSearch.test.js`, `rag/storage/chunkStore.test.js`, `mongoClient.test.js`, `vectorIndex.test.js`, `rag/embeddings/embeddingPipeline.test.js`, `providers/*.test.js`.

**Open items (not blocking, later):**

- Retriever should skip chunks of sources with `active = false` in the registry (admin toggle, US-12).
- `runEvaluation()` entry point for `POST /api/evaluation/run`.
- Confirm the licence / approval basis of the tafsir source (`تيسير التفسير`) before it appears in the public demo.
- **Source-id consistency:** `rag/ingestion/quran/quranIngestion.js` writes `sourceId: "quran-quranpedia-hafs"`, while `quranFullIngestion.js` and the chunks/registry use `"quranpedia-quran-hafs"`. Confirm one canonical id before ingestion.
- **Duplicated provider:** `voyageEmbeddingProvider.js` exists in both `providers/` and `rag/embeddings/`. The wiring (`index.js`) uses `providers/`; the quran full-ingest script uses `rag/embeddings/`. Consolidate.
- **Evidence citation fields:** `vectorRetriever` builds `evidence.citation = { sourceId, chunkId, reference }` (no `sourceTitle`), while the draft copies `citation.sourceTitle`. If the evidence card must show a human-readable source title, the chunk metadata / retriever must populate it.
- **Empty stubs:** `rag/ingestion/ingestSources.js` and `classifier/classificationPrompt.js` are empty / reserved.
- **`CLARIFY` not produced:** `CLARIFY` is defined in `aiTypes`, but the current `classifierRules` map levels A–D only to `ANSWER` / `REFER`, so `CLARIFY` is never emitted.

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
| POST | `/api/drafts/:id/approve` | `{ acknowledgeWarnings?: boolean }` → publishes the answer, returns `{ answerId }`. **422** `blocked` if the draft is blocked, **422** `warnings_not_acknowledged` if required (see 1.6). |
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
  "evidence": [ /* same shape as 1.3 */ ],
  "citations": [ /* same shape as 1.3 */ ],
  "verification": { /* same shape as 1.3, or null */ },
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
| POST | `/api/evaluation/run` | Runs the fixed challenge test set, returns the report (depends on the `runEvaluation()` open item in 1.11) |

### 2.4 Scoring (backend only, no endpoint)

On every `select`, the Backend recalculates the score of that answer deterministically (selection points + evidence-quality points from `verification`; ineligible if safety failed) and stores the breakdown. The dāʿī sees the total in `dashboard.stats.score`. The score is never produced by an LLM.

### 2.5 Mock for the Frontend

Until the Backend is deployed, the Frontend can mock these responses with the shapes above. Any change to a shape goes through a PR on this file first.
