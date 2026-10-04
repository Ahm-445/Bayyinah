# Bayyinah – API & Integration Contract

Owner: Backend. Status: **draft v0.2 – for team agreement (4 Oct 2026)**.
Anyone who needs a change to this file opens a PR and tags the Backend owner.

This file has two parts:

1. **AI ↔ Backend contract**: the public API of the AI module and the responsibility of each of its internal components (based on the code in `server/src/modules/ai`).
2. **REST API**: what the Frontend calls.

---

## Part 1 – AI module: API & responsibilities

### 1.1 Module boundary and public entry points

The AI module is self-contained under `server/src/modules/ai`. It is the **only** place that does classification, retrieval, generation and verification. The Backend must never call classifier / retriever / generator / verifier directly; it only uses the module's public surface.

`server/src/modules/ai/index.js` exposes exactly:

| Export | Signature | Purpose |
|---|---|---|
| `getOrchestrator()` | `() -> Promise<{ processQuestion }>` | Returns the shared orchestrator, created once on first use. Throws if config is missing or MongoDB is unreachable. **A failed attempt is not cached** — the next call retries. |
| `closeAI()` | `() -> Promise<void>` | Closes the AI module's MongoDB connection (for shutdown and ingest scripts). Resets the cached orchestrator. |

`getOrchestrator()` guarantees `processQuestion` is available. Nothing else is exported.

### 1.2 The single call the Backend makes

```
result = await orchestrator.processQuestion({ questionId, text, language })
```

- `questionId` — Backend question `_id`, as a **string**.
- `text` — question text (string, non-empty).
- `language` — a BCP-47-ish string such as `"en"` / `"ar"`.

The function **throws** on invalid input (missing/`questionId`, empty `text`, missing `language`) and on provider / MongoDB failure. The Backend catches this and marks the question `failed`.

### 1.3 The result (`AIResult`)

Defined by `ai/contracts/aiResultContract.js` and `aiTypes.js`. The Backend relies on exactly these fields:

```jsonc
{
  "action": "ANSWER | CLARIFY | ABSTAIN | REFER",
  "classification": {
    "category": "aqeedah",              // QUESTION_CATEGORIES
    "level": "A | B | C | D",           // QUESTION_LEVELS
    "risk": "low | medium | high",      // RISK_LEVELS
    "action": "ANSWER",                 // AI_ACTIONS
    "reasons": ["..."]
  },
  "safety": { "decision": "ALLOW | REVIEW | BLOCK", "reason": "..." },
  "evidence": [
    {
      "sourceId": "quranpedia-quran-hafs",
      "chunkId": "...",                 // string, NOT an ObjectId
      "text": "...",
      "score": 0.87,                    // 0..1 — relevance only, NOT correctness
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

Each sub-object is produced by a **contract factory** that validates before returning. Invalid values throw (`classificationContract` validates category/level/risk/action; `evidenceContract` requires `0 <= score <= 1` and a citation object; `draftContract` requires non-empty answer + language; `verificationContract` requires booleans and arrays).

`AI_ACTIONS` values: `ANSWER`, `CLARIFY`, `ABSTAIN`, `REFER`. `QUESTION_LEVELS`: `A`, `B`, `C`, `D`.

### 1.4 How the Backend interprets the result

| AI result | Question status | Draft status | Dāʿī can approve? |
|---|---|---|---|
| `action = ANSWER`, `verification.status = PASS` | `awaiting_review` | `in_review` | Yes |
| `action = ANSWER`, `NEEDS_REVIEW` or `safety.decision = REVIEW` | `awaiting_review` | `in_review` | Yes, only with `acknowledgeWarnings: true` |
| `action = ABSTAIN` (insufficient evidence, or citation / evidence verification `FAIL`) | `awaiting_review` | `blocked` | No |
| `action = REFER` (level D / high risk) | `referred` | `blocked` | No |
| `processQuestion` throws | `failed` | none | n/a |

Rows are evaluated top-to-bottom on `action` first: an `ABSTAIN` result is always `blocked`, even though the orchestrator sets `safety.decision = REVIEW` for insufficient evidence.

Rule from the project plan: **nothing becomes public without dāʿī approval**, and an unverified draft is never publishable.

### 1.5 The pipeline: ordered stages and who owns each step

`orchestrator/aiOrchestrator.js` runs these stages in order and **does not** contain the implementation of any of them. Each stage is injected, so the orchestrator is pure composition.

1. **Classify** — `classifier.questionClassifier.classifyQuestion(text)` → deterministic, **no LLM**. Returns `{ category, level, risk, action, reasons }` (see 1.6).
2. **Safety** — `safety.safetyGate.evaluateSafety(classification)` → `{ decision, reason }`; then `safety.safetyDecisionHandler.handleSafetyDecision(safety)` → `{ action, shouldGenerate, requiresReview, reason }`.
3. **Early exit (block)** — if `!shouldGenerate` (level D / high risk / `REFER`), return immediately with `action = REFER`, `evidence = []`, `draft = null`, `verification = null`. No retrieval or generation.
4. **Retrieve** — `retriever.retrieve(text)` → evidence list from `knowledge_chunks` (see 1.7).
5. **Evidence sufficiency** — `rag.retrieval.evidenceSufficiency.checkEvidenceSufficiency(evidence)` with defaults `minimumEvidence = 1`, `minimumScore = 0.7`. If not sufficient, return `action = ABSTAIN`, `draft = null`, `verification = null`, and **override** `safety.decision = REVIEW` with reason "Retrieved evidence is insufficient for generation."
6. **Generate draft** — `draftGenerator.generateDraft({ question: text, language, evidence })` → builds the generation prompt, calls the LLM (`temperature 0.2`), returns a `Draft` with citations derived from the evidence.
7. **Citation verification** — `verifier.verificationCombiner`'s inputs start with `citationVerifier.verifyCitations(draft, evidence)`. Every citation must map to a retrieved `sourceId:chunkId`, else `FAIL`. If `FAIL`, return `action = ABSTAIN` with `verification = citationVerification`.
8. **Semantic evidence verification** — `evidenceVerifier.verify({ question, draft, evidence })` via the LLM (`temperature 0`), parsed to JSON. The two verification results are merged by `combineVerificationResults`.

Final `action`: if `evidenceVerification.status === "FAIL"` → `ABSTAIN`, otherwise `classification.action`. The `verification` returned is the combined result.

### 1.6 Component responsibilities

#### Classifier (`classifier/`)
Deterministic, synchronous, no model. Responsibilities:
- **categoryDetector** — choose the best `QUESTION_CATEGORIES` from keyword counts; ties broken by `categoryPriority` (specific categories before broad ones; `OTHER` is the fallback).
- **levelDetector** — map text to a level using indicators: personal-case indicators → `D`; disputed/sensitive indicators → `C`; explanation/definition/reasoning indicators → `B`; otherwise `A`.
- **riskDetector** — `A`/`B` → `low`, `C` → `medium`, `D` → `high`.
- **actionDetector** — `A`/`B`/`C` → `ANSWER`, `D` → `REFER`.
- **textNormalizer** — lowercase, trim, collapse whitespace.
- `classificationPrompt.js` is currently **empty** (the classifier is rule-based, not prompted).

`classifyQuestion` only *classifies*; it produces no answer.

#### Safety (`safety/`)
Enforces the guardrails set by the classification. `evaluateSafety`:
- `level D` → `BLOCK` ("Personal or individual ruling requires referral").
- `level C` → `REVIEW` ("Disputed or high-sensitivity issue requires review").
- `risk = high` or `action = REFER` → `BLOCK` ("High-risk request requires referral").
- otherwise → `ALLOW`.

`handleSafetyDecision` converts a decision into pipeline control: `ALLOW` → generate with no review flag; `REVIEW` → generate but `requiresReview: true`; `BLOCK` → `shouldGenerate: false`, `action = REFER` (generation never happens).

#### Retrieval (`rag/retrieval/`)
- **retriever** — wraps the vector retriever; validates `db`, embedder and `topK`.
- **vectorRetriever** — embeds the question (`inputType: "query"`), runs MongoDB `$vectorSearch` on `knowledge_chunks` (`embedding` path, cosine, `numCandidates = max(topK*10, 50)`, `limit = topK = 3`), projects to `chunkId/sourceId/text/metadata/model/dimensions` plus `score` via `$meta: "vectorSearchScore"`. Builds `Evidence` via the evidence contract, with `citation.reference` from `metadata.reference`.
- **evidenceSufficiency** — a relevance-only gate. It does **not** judge scholarly correctness; it decides whether enough *relevant* evidence was retrieved to attempt generation.

#### Generator (`generator/`)
`createDraftGenerator({ llmProvider, model })` → `generateDraft({ question, language, evidence })`. Builds the generation prompt, sends to the LLM (`temperature 0.2`), and returns a `Draft` whose `citations` are derived from the retrieved evidence (`sourceId`, `chunkId`, `sourceTitle`, `reference`). The generation prompt forbids inventing sources/citations/fatwas and requires the draft to be evidence-bound and respectful. The generated draft is **not** a published answer.

#### Verifier (`verifier/`)
- **citationVerifier** — `verifyCitations(draft, evidence)`; only checks that every citation key (`sourceId:chunkId`) exists in the retrieved evidence. Sets `citationValid`, and `FAIL` on missing/invalid citations.
- **evidenceVerifierService** — orchestrates the semantic check: provider → parse → status.
- **semanticVerificationProvider** — LLM (`temperature 0`) verifies whether the draft's claims are supported by the evidence, returning the structured JSON.
- **verificationResponseParser** — parses and validates that JSON (`evidenceSupported` boolean, `unsupportedClaims`/`warnings`/`riskFlags` arrays).
- **verificationRules** — `determineVerificationStatus`: any invalid citation, unsupported claim, or missing citation → `FAIL`; any risk flag or warning → `NEEDS_REVIEW`; otherwise `PASS`.
- **verificationCombiner** — merges citation + evidence verification into one result.

`PASS` only means automated checks passed; it never means the dāʿī should auto-publish.

#### Providers (`providers/`)
- **geminiLLMProvider** — `@google/genai` wrapper; `generate(prompt, { temperature }) -> string`. Default model `gemini-3.1-flash-lite` (overridable via `GEMINI_MODEL`).
- **voyageEmbeddingProvider** — calls MongoDB's embedding endpoint `https://ai.mongodb.com/v1/embeddings` with `model = voyage-4-large`, `output_dimension = 1024`. Supports `embed(text, { inputType })` with `inputType` in `"query"` / `"document"`.
- **llmProvider** / **embeddingProvider** — the provider contracts (`generate` / `embed`) and response validators, so the rest of the module never depends on a concrete provider.

#### Contracts (`contracts/`)
Application-level data factories (not MongoDB schemas), each validating its inputs and throwing on invalid values: `aiTypes` (enums + typedefs), `aiResultContract`, `classificationContract`, `evidenceContract`, `draftContract`, `verificationContract`.

#### RAG ingestion (`rag/ingestion/`)
Approved source material is parsed, chunked and embedded into `knowledge_chunks`. Responsibilities:
- **sourceContract / sourceValidator** — an approved source must have `sourceId`, title, domain, type, language, reference and be marked active.
- **ingestionPipeline** + **textChunker** — split text into chunks (default `maxCharacters = 1000`, `overlapCharacters = 100`), each carrying a deterministic `chunkId` like `<sourceId>-chunk-0001` and metadata (`sourceTitle`, `sourceType`, `language`, `reference`, `chunkIndex`).
- **quran/** and **tafsir/** builders — parse (e.g. a Quranpedia dump), build per-ayah / per-verse chunks, embed, and bulk-write to `knowledge_chunks` with model + dimensions.
- Note: there are two Quran ingestion entry points (`quranFullIngestion.js` and `quranIngestion.js`). They use different source IDs (`quranpedia-quran-hafs` vs `quran-quranpedia-hafs`). The registry and `docs/api.md` use `quranpedia-quran-hafs`. See open items.

### 1.7 Data ownership in MongoDB

Same database (`MONGODB_DB_NAME`, default `bayyinah`), two connections: the AI module uses the native `mongodb` driver, the Backend uses Mongoose. The Backend passes `dbName` to Mongoose explicitly, so both always target the same database.

| Collection | Owner | Notes |
|---|---|---|
| `knowledge_chunks` | **AI** | Backend never writes. IDs are strings (`chunkId`, `sourceId`) and `embedding` is a 1024-dim float vector (cosine). The vector index is `knowledge_chunks_vector_index`. |
| `sources` (registry) | **Backend** | One document per `sourceId` string (e.g. `quranpedia-quran-hafs`). Has `active`, `usageBasis`. |
| `users`, `questions`, `drafts`, `answers`, `selections`, `scores`, `audit_logs` | **Backend** | `drafts` stores a **snapshot** of `evidence`, `citations` and `verification` as embedded objects (string ids), so a published answer stays traceable even if chunks are re-ingested. |

### 1.8 Integration setup (already wired by the Backend)

1. **Wiring**: `server/src/modules/ai/index.js` (new file; no existing AI file was modified) exports `getOrchestrator()` and `closeAI()`. It builds the same composition as `orchestrator/realOrchestrator.test.js` (`topK: 3`, MongoDB + Voyage + Gemini, draft generator, citation + evidence verifiers). The orchestrator is created once on first use; a failed attempt is not cached.
2. **Errors**: `processQuestion` and `getOrchestrator()` throw on failure (missing env, MongoDB down, provider error). The Backend catches this and sets `question.status = failed`.
3. **Source registry**: `data/source-registry.json` holds `quranpedia-quran-hafs` and `quranpedia-tafsir-book-1`, copied from the chunk builders. The `usageBasis` of the tafsir entry is marked **TO CONFIRM** (see open items).
4. **Dependencies**: `@google/genai` and `mongodb` are in `server/package.json` (Voyage is called with `fetch`, no SDK). The root `package.json` still lists `@google/genai`; it is harmless but can be removed.
5. **Env vars** (keep names stable), read from `process.env` (the Backend config loads `server/.env` before the AI module is used; `ai/index.js` does not load dotenv itself):
   - `MONGODB_URI`, `MONGODB_DB_NAME`
   - `GEMINI_API_KEY`, optional `GEMINI_MODEL`
   - `VOYAGE_API_KEY`, optional `VOYAGE_EMBEDDING_MODEL`

### 1.9 Open items (not blocking, later)

- Retriever should skip chunks of sources with `active = false` in the registry (admin toggle, US-12); it currently retrieves from all `knowledge_chunks`.
- `runEvaluation()` entry point for `POST /api/evaluation/run`.
- Confirm the licence / approval basis of the tafsir source (`تيسير التفسير`) before it appears in the public demo.
- Reconcile the two Quran ingestion scripts and their source IDs (`quranpedia-quran-hafs` vs `quran-quranpedia-hafs`) so the registry and the stored chunks agree. `quranFullIngestion.js` also references `rag/embeddings/voyageEmbeddingProvider`, which does not match the module's actual embedding provider path (`providers/voyageEmbeddingProvider.js`).

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
| POST | `/api/drafts/:id/approve` | `{ acknowledgeWarnings?: boolean }` → publishes the answer, returns `{ answerId }`. **422** `blocked` if the draft is blocked, **422** `warnings_not_acknowledged` if required (see 1.4). |
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
| POST | `/api/evaluation/run` | Runs the fixed challenge test set, returns the report (depends on the `runEvaluation()` open item in 1.9) |

### 2.4 Scoring (backend only, no endpoint)

On every `select`, the Backend recalculates the score of that answer deterministically (selection points + evidence-quality points from `verification`; ineligible if safety failed) and stores the breakdown. The dāʿī sees the total in `dashboard.stats.score`. The score is never produced by an LLM.

### 2.5 Mock for the Frontend

Until the Backend is deployed, the Frontend can mock these responses with the shapes above. Any change to a shape goes through a PR on this file first.
