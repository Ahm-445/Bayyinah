# Bayyinah backend API (initial integration)

The backend exposes a health check and a synchronous question-to-AI endpoint. The AI result is server-generated through the existing AI orchestrator; clients cannot supply classifications, safety decisions, evidence, citations, verification, prompts, providers, or model settings.

## `GET /api/health`

Returns `200` with `{ "status": "ok", "db": "connected", "uptime": number }` when MongoDB is connected. Otherwise it returns `503` with a degraded status. It never reports credentials or provider configuration.

## `POST /api/questions/:questionId/ai-answer`

This endpoint currently has **no authentication or authorization**. JWT, session IDs, ownership checks, and user accounts are not implemented. Treat this as a temporary hackathon integration endpoint and do not expose it publicly until real authentication and abuse controls are implemented.

Request JSON accepts only:

```json
{ "text": "What does Tawhid mean in Islam?", "language": "en" }
```

`text` is required when creating a question and must contain 1–2000 characters. `language` is optional and must be `ar` or `en`; it is stored as question metadata. The current orchestrator detects answer language from the question text, so this field does not override that behavior. The backend can also process an existing stored question by sending `{}`. A supplied text must match an existing question. Unknown fields and AI-result fields are rejected.

For a new `questionId`, the backend creates the minimum Question record. It returns the orchestrator's actual `action`, `classification`, `safety`, `evidence`, `draft`, and `verification` fields, plus question status, `draftStatus`, and `published: false`. Generated text is always a draft; no answer is published or persisted as an approved answer. `ABSTAIN` and `REFER` are preserved.

Provider or infrastructure failures return a generic `503` response. Internal details are logged on the server and are not returned to clients.
