# Bayyinah backend API

The backend exposes a health check, a synchronous question-to-AI endpoint, and a small Da‘i review workflow. The AI result is server-generated through the existing AI orchestrator; clients cannot supply classifications, safety decisions, evidence, citations, verification, prompts, providers, or model settings.

## `GET /api/health`

Returns `200` with `{ "status": "ok", "db": "connected", "uptime": number }` when MongoDB is connected. Otherwise it returns `503` with a degraded status. It never reports credentials or provider configuration.

## `POST /api/questions/:questionId/ai-answer`

This endpoint currently has **no authentication or authorization**. JWT, session IDs, ownership checks, and user accounts are not implemented. Treat this as a temporary hackathon integration endpoint and do not expose it publicly until real authentication and abuse controls are implemented.

Request JSON accepts only:

```json
{ "text": "What does Tawhid mean in Islam?", "language": "en" }
```

`text` is required when creating a question and must contain 1–2000 characters. `language` is optional and must be `ar` or `en`; it is stored as question metadata. The current orchestrator detects answer language from the question text, so this field does not override that behavior. The backend can also process an existing stored question by sending `{}`. A supplied text must match an existing question. Unknown fields and AI-result fields are rejected.

For a new `questionId`, the backend creates a Question and persists every completed AI result in the review collection. The response retains `action` for compatibility and always adds `aiAction` with one of `ANSWER`, `CLARIFY`, `ABSTAIN`, or `REFER`. It includes `classification`, `safety`, `evidence` (always an array), and `draft` / `verification` when available. Verse-based evidence also exposes `reference`, `surahNumber`, `ayahNumber`, `sourceType`, and `language` at the evidence-item level. The response includes `draftId`, `draftStatus: "pending_review"`, and `published: false` for every completed result. `CLARIFY` is accepted by the result contract but is not currently emitted by the classifier or orchestrator.

Only an `ANSWER` with a draft, non-`BLOCK` safety, and `PASS` or `NEEDS_REVIEW` verification can be approved. Other actions and ineligible answer results remain visible in the Da‘i queue but cannot be published as answers. They can be marked reviewed; that changes their review record to `reviewed` while keeping `published: false`.

Draft generation follows the question's detected language. The generator checks the generated text's dominant Arabic/Latin script and fails closed if it does not match. Quran, translation, and tafsir evidence with surah and ayah metadata receives a readable in-text marker such as `(Al-Ikhlas 112:1)` or `(الإخلاص 112:1)`; verse numbers come from the retrieved evidence. Other sources use their supplied source reference; they are not forced into Quran verse format.

## `GET /api/review/drafts`

Returns all AI result records with `draftStatus: "pending_review"` for the Da‘i review screen, including `ABSTAIN`, `REFER`, and future `CLARIFY` outcomes. Each item includes `aiAction`, classification, safety, evidence, draft and verification when available, and `published: false`.

## `POST /api/review/drafts/:draftId/decision`

Accepts one of these JSON bodies:

```json
{ "decision": "reject" }
```

```json
{ "decision": "approve", "acknowledgeWarnings": true }
```

```json
{ "decision": "dismiss" }
```

Only a pending, eligible `ANSWER` can be approved. Warning acknowledgement is required when safety is `REVIEW`, verification is `NEEDS_REVIEW`, or verification includes warnings or risk flags. Approval atomically changes the answer state to `published`; rejection changes it to `rejected`. `dismiss` is only for outcomes that cannot be published and changes them to `reviewed`. Repeated decisions are rejected. There is no reviewer identity because authentication and user accounts are not implemented.

## `GET /api/questions/:questionId/published-answer`

Returns an answer only after a Da‘i has approved it. Before approval, the endpoint returns `404` with `answer_not_found`. The response includes the approved answer, citations, `published: true`, and publication time.

The review and published-answer endpoints also have **no authentication or authorization**. They are demo-only and must not be exposed publicly until real reviewer authentication and abuse controls are implemented. Drafts and their evidence snapshots are stored in MongoDB for this workflow; provider output and credentials are not stored.

Provider or infrastructure failures return a generic `503` response. Internal details are logged on the server and are not returned to clients.
