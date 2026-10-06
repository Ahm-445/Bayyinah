# Architecture

Bayyinah has three parts that share one MongoDB database:

```
Questioner / Dāʿī (browser)
        │  HTTPS, JSON, Bearer JWT
        ▼
client/  React 19 + Vite + Tailwind, TanStack Query        (static site)
        │  /api/...
        ▼
server/  Node.js + Express 5, Mongoose                     (web service)
   ├── routes, controllers, services   accounts, questions, drafts, answers, sources
   └── src/modules/ai                  the AI pipeline (processQuestion)
              │                │
              ▼                ▼
     OpenAI / Gemini      Voyage AI embeddings
     (draft + verify)     (question + chunk vectors)
        │
        ▼
MongoDB Atlas   app_* collections (application data)
                knowledge_chunks + Atlas Vector Search index (approved sources)
```

## Request flow

1. A **questioner** registers, asks a question (`POST /api/questions`) and gets an id back at once.
2. The server runs the AI pipeline in the background (`services/questionProcessor.js` → `modules/ai.processQuestion`).
   The pipeline classifies the question, retrieves evidence from approved sources, drafts an answer and verifies it.
   See [ai-workflow.md](ai-workflow.md).
3. The server creates **one draft per dāʿī** with the AI result (draft text, evidence, verification, safety).
4. Each **dāʿī** reviews the draft in the browser: edits it, inserts citations from the evidence panel, then approves
   (publishes) or rejects it. Anything the AI could not fully back up (failed or partial verification, a referral,
   an abstention) needs an explicit acknowledgement before publishing. The AI never publishes and never blocks the dāʿī.
5. The **questioner** sees the published answers, compares them and selects the most helpful one.
   Each published answer and each selection adds points to the dāʿī (`services/scoring.js`, recomputed on read).

The client polls `GET /api/questions/:id` while the AI is working. The full API is in [api.md](api.md).

## Folders

| Path | Contents |
|---|---|
| `client/src/features` | Pages by feature: `auth`, `ask`, `question`, `question-history`, `daee-queue`, `draft-review`, `admin-eval` |
| `client/src/services` | API transport (real backend or in-browser mock), mappers, session |
| `server/src/routes`, `controllers`, `services`, `models` | REST API, business rules, Mongoose models |
| `server/src/modules/ai` | Classifier, safety gate, retriever, generator, verifiers, providers, ingestion |
| `server/tests` | API integration tests, citation tests, live workflow tests |
| `scripts/seed-db.js` | Creates the dāʿī/admin accounts and loads `data/source-registry.json` |
| `data/source-registry.json` | The approved sources (see [source-registry.md](source-registry.md)) |

## Data

| Collection | Written by | Contents |
|---|---|---|
| `app_users` | backend | accounts (`questioner`, `daee`, `admin`), scrypt password hashes |
| `app_questions` | backend | question text, language, status, classification |
| `app_drafts` | backend | one per dāʿī per question: AI result, edits (versions), status |
| `app_answers` | backend | published answers with the citations the dāʿī used |
| `app_selections` | backend | the questioner's chosen answer |
| `app_sources` | seed script | approved source registry (admin can toggle `active`) |
| `app_audit_logs` | backend | who approved/rejected what, and when |
| `knowledge_chunks` | AI ingestion | source text chunks with metadata and 1024-dim embeddings |

## Security and privacy

- JWT authentication; role checks on every route; someone else's question or draft returns `404`.
- Rate limits on sign-in, registration and questions (each question costs model credit).
- Questioners register with a username and password only; the ask page asks them not to include personal details.
- API keys stay on the server (`server/.env`, never committed). Only `VITE_*` values reach the browser.

## Deployment

Render, from `render.yaml`: the backend as a Node web service (`server/`), the frontend as a static site (`client/`)
with a rewrite of `/*` to `/index.html`. Live links are in the [README](../README.md).
