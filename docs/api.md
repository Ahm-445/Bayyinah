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

For a new `questionId`, the backend creates the minimum Question record. It returns the orchestrator's actual `action`, `classification`, `safety`, `evidence`, `draft`, and `verification` fields, plus question status, `draftId` when reviewable, `draftStatus`, and `published: false`. An `ANSWER` result is saved as `pending_review` only when it has a draft answer, safety is not `BLOCK`, and verification is `PASS` or `NEEDS_REVIEW`. `ABSTAIN`, `REFER`, `CLARIFY`, blocked, and failed-verification results are not added to the review queue. The seeker response never marks an AI draft as published.

## `GET /api/review/drafts`

Returns drafts with `draftStatus: "pending_review"` for the Da‘i review screen. Each item includes the question, action, classification, safety, evidence, draft, and verification fields. The response sets `published: false`.

## `POST /api/review/drafts/:draftId/decision`

Accepts exactly one of these JSON bodies:

```json
{ "decision": "reject" }
```

```json
{ "decision": "approve", "acknowledgeWarnings": true }
```

Only a pending, eligible `ANSWER` can be approved. Warning acknowledgement is required when safety is `REVIEW`, verification is `NEEDS_REVIEW`, or verification includes warnings or risk flags. Approval atomically changes the draft state to `published`; rejection changes it to `rejected`. Repeated decisions are rejected. There is no reviewer identity because authentication and user accounts are not implemented.

## `GET /api/questions/:questionId/published-answer`

Returns an answer only after a Da‘i has approved it. Before approval, the endpoint returns `404` with `answer_not_found`. The response includes the approved answer, citations, `published: true`, and publication time.

The review and published-answer endpoints also have **no authentication or authorization**. They are demo-only and must not be exposed publicly until real reviewer authentication and abuse controls are implemented. Drafts and their evidence snapshots are stored in MongoDB for this workflow; provider output and credentials are not stored.

Provider or infrastructure failures return a generic `503` response. Internal details are logged on the server and are not returned to clients.
