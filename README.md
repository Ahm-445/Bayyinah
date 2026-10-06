# Bayyinah – بيّنة

**إجابات موثّقة لأسئلة غير المسلمين، يكتبها الدعاة ويتحقق منها الذكاء الاصطناعي.**
Sourced answers to non-Muslims' questions about Islam: written by dāʿīs, checked by AI.

Islamic AI Challenge 2026, track 04: knowledge and verification tools for people who introduce Islam.

| | |
|---|---|
| Live app | https://bayyinah-frontend.onrender.com |
| API health | https://bayyinah-eteb.onrender.com/api/health |
| Demo script | [docs/demo-script.md](docs/demo-script.md) |

> Render's free plan puts the backend to sleep when idle. Open the health link first and wait for
> `"status":"ok"` (up to a minute) before trying the app.

## The problem

- A **non-Muslim asker** rarely gets an easy, sourced answer: public platforms give unsourced or hostile replies,
  and one dāʿī gives one point of view and may reply late.
- A **dāʿī** spends much of the time checking sources; weak hadiths or imprecise evidence can slip into an answer.

## How it works

1. The asker writes a question in Arabic or English.
2. The AI classifies it (topic, language, level A–D) and retrieves evidence **only** from approved sources:
   the Qur'an, a tafsir, and Sahih al-Bukhari and Sahih Muslim.
3. It drafts an answer with inline references such as `(الإخلاص 112:1)`, then verifies every reference and every
   factual sentence against the evidence.
4. Each dāʿī receives the question with the draft, the evidence (hadith grades included) and the verification
   result, then edits it, inserts citations and publishes, or writes their own answer.
5. The asker compares the dāʿīs' answers and selects the most convincing one; the dāʿī earns points.

The AI never publishes. Personal fatwa requests (level D) are referred to a scholar with no AI draft; when the
sources are not enough, the AI abstains instead of guessing.

Details: [architecture](docs/architecture.md) · [AI workflow](docs/ai-workflow.md) · [API](docs/api.md) ·
[sources](docs/source-registry.md) · [testing](docs/testing.md)

## AI disclosure

Bayyinah uses AI to classify questions, retrieve evidence and draft and verify answers:
OpenAI `gpt-5.4-mini` (or Google Gemini) for drafting and verification, and Voyage AI `voyage-4-large`
embeddings for retrieval. The app tells askers and dāʿīs that drafts are AI-prepared, and every answer an asker
sees has been reviewed and published by a person.

## Sources (summary)

| Source | Version | Provider |
|---|---|---|
| القرآن الكريم – حفص عن عاصم | 2026-09-30 | Quranpedia.net |
| Saheeh International (English) | 2026-10-02 | Quranpedia.net |
| تيسير التفسير – إبراهيم القطان | 2026-08-10 | Quranpedia.net |
| Sahih al-Bukhari, Sahih Muslim | v1.2.0 | AhmedBaset/hadith-json (from Sunnah.com) |

How each source is used and verified, with its usage terms: [docs/source-registry.md](docs/source-registry.md).

## Keys and secrets

**No key, password or connection string is in this repository.** Each one is read from environment variables:
`server/.env` on your machine (git-ignored; copy [`.env.example`](.env.example)) or the service's
*Environment* settings on Render. The frontend never holds a secret; only the backend calls paid APIs.

The live demo above runs on the team's own keys. To run your own copy, create the keys below. Judges who need
temporary test credentials or the demo dāʿī accounts can ask the team; they are shared privately, never here.

### Backend (`server/.env`)

| Variable | Needed for | Where to get it / value |
|---|---|---|
| `MONGODB_URI` | Always: app data, knowledge base, vector search | [MongoDB Atlas](https://www.mongodb.com/docs/atlas/getting-started/): create a cluster → *Database Access* (add a user) → *Network Access* (allow your IP) → *Connect* → *Drivers* → copy the `mongodb+srv://…` string |
| `MONGODB_DB_NAME` | Optional | Database name, default `bayyinah` |
| `JWT_SECRET` | Required in production | Any long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SEED_PASSWORD` | Required in production | Password you choose for the seeded dāʿī/admin accounts (`npm run seed`) |
| `OPENAI_API_KEY` | Real AI (default provider) | [OpenAI platform → API keys](https://platform.openai.com/api-keys). Model used: `gpt-5.4-mini` |
| `LLM_PROVIDER`, `GEMINI_API_KEY` | Optional alternative to OpenAI | Set `LLM_PROVIDER=gemini` and a key from [Google AI Studio](https://aistudio.google.com/apikey). Model used: `gemini-3.1-flash-lite` |
| `VOYAGE_API_KEY` | Real AI (embeddings for retrieval) | Voyage AI by MongoDB: in Atlas, *Services → AI Model APIs → Model API Keys → Create model API key* ([guide](https://www.mongodb.com/docs/voyageai/management/api-keys/)). Model used: `voyage-4-large` |
| `VOYAGE_EMBEDDING_MODEL` | Optional | Default `voyage-4-large`; must match the model the knowledge base was embedded with |
| `AI_MODE` | Optional | `real` or `mock`; empty = `real` when the AI keys exist, else `mock` (canned, labelled results, no keys needed) |
| `CLIENT_ORIGIN` | Production | Frontend URL(s) allowed by CORS, comma separated (default in production: the Render frontend) |
| `NODE_ENV`, `PORT`, `TRUST_PROXY`, `AI_TIMEOUT_MS`, `RATE_LOGIN_MAX`, `RATE_REGISTER_MAX`, `RATE_QUESTIONS_MAX`, `MOCK_AI_DELAY_MS` | Optional | Explained in [`.env.example`](.env.example) |
| `RUN_LIVE_AI_TESTS`, `RUN_LIVE_TAFSIR_TESTS`, `RUN_LIVE_HADITH_TESTS`, `RUN_LIVE_KNOWLEDGE_E2E`, `KNOWLEDGE_E2E_CASE`, `SAHEEH_TRANSLATION_SOURCE_URL`, `SAHEEH_TRANSLATION_SOURCE_VERSION` | Live tests only | Set by the `npm run test:*-workflow` / `validate:*` scripts; see [docs/testing.md](docs/testing.md) |

### Frontend (`client/.env.local`, no secrets)

| Variable | Value |
|---|---|
| `VITE_USE_MOCKS` | `false` to use the backend, `true` for the in-browser mock API |
| `VITE_API_BASE_URL` | `/api` locally; the backend's full URL for a deployed build (e.g. `https://bayyinah-eteb.onrender.com/api`) |
| `VITE_API_PROXY_TARGET` | Local dev only: where `/api` is proxied (default `http://localhost:5000`) |

## External APIs and services

| Service | Used for | Called from | Documentation |
|---|---|---|---|
| OpenAI Responses API | Drafting answers and claim-level verification | Backend (`server/src/modules/ai/providers/openaiLLMProvider.js`) | [API reference](https://developers.openai.com/api/reference/resources/responses) |
| Google Gemini API (optional) | Same, when `LLM_PROVIDER=gemini` | Backend (`geminiLLMProvider.js`) | [Gemini API docs](https://ai.google.dev/gemini-api/docs) |
| Voyage AI embeddings (`https://ai.mongodb.com/v1/embeddings`) | Embedding questions and source chunks | Backend (`voyageEmbeddingProvider.js`) and ingestion scripts | [Voyage AI by MongoDB](https://www.mongodb.com/docs/voyageai/) |
| MongoDB Atlas + Atlas Vector Search | Database and semantic search over `knowledge_chunks` | Backend | [Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/) |
| Render | Hosting of the backend and the static frontend | `render.yaml` | [Render docs](https://render.com/docs) |
| Google Fonts | Arabic fonts (Amiri, IBM Plex Sans Arabic, Noto Naskh Arabic) | Browser | [fonts.google.com](https://fonts.google.com/) |

External data sources (downloaded once at ingestion time, not called at runtime):
[Quranpedia.net dumps](https://quranpedia.net/dumps) (Qur'an text, Saheeh International translation, tafsir) and
[AhmedBaset/hadith-json v1.2.0](https://github.com/AhmedBaset/hadith-json/tree/v1.2.0) (Sahih al-Bukhari, Sahih Muslim,
from Sunnah.com). Hadith evidence links to [sunnah.com](https://sunnah.com). Details and usage terms:
[docs/source-registry.md](docs/source-registry.md).

## Run it

Requirements: Node.js 22 and npm. For real AI mode: a MongoDB Atlas cluster, an OpenAI (or Gemini) key and a
Voyage AI key (see [Keys and secrets](#keys-and-secrets)).

### Quick start without AI keys (mock mode)

```bash
# Backend: only MONGODB_URI is needed; AI results are canned and labelled
cd server
npm install
cp ../.env.example .env        # fill MONGODB_URI
npm run seed                   # accounts khalid, maryam, admin (password: SEED_PASSWORD, or demo1234 outside production)
npm run dev                    # http://localhost:5000/api/health → "ai":"mock"

# Frontend (second terminal)
cd client
npm install
cp .env.example .env.local     # set VITE_USE_MOCKS=false
npm run dev                    # http://localhost:5173
```

Frontend only, no backend at all: keep `VITE_USE_MOCKS=true` in `client/.env.local`.

### Full setup with real AI

1. **Keys**: fill `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY` (or `LLM_PROVIDER=gemini` + `GEMINI_API_KEY`) and
   `VOYAGE_API_KEY` in `server/.env`, then `cd server && npm install`.
2. **Knowledge base** (embeds every chunk with Voyage; run once, from `server/`):
   ```bash
   # Qur'an and tafsir: the dumps are already in server/data/
   node src/modules/ai/rag/ingestion/quran/quranFullIngestion.js
   node src/modules/ai/rag/ingestion/tafsir/tafsirFullIngestion.js

   # Saheeh International: download "1947.json" (translation 1947) from https://quranpedia.net/dumps
   node src/modules/ai/rag/ingestion/translations/saheehInternationalFullIngestion.js \
     --file <path>/1947.json --source-url https://quranpedia.net/ --source-version <dump version> \
     --usage-basis "Quranpedia usage terms" --approved

   # Bukhari and Muslim (hadith-json v1.2.0)
   curl -LO https://raw.githubusercontent.com/AhmedBaset/hadith-json/v1.2.0/db/by_book/the_9_books/bukhari.json
   curl -LO https://raw.githubusercontent.com/AhmedBaset/hadith-json/v1.2.0/db/by_book/the_9_books/muslim.json
   node src/modules/ai/rag/ingestion/hadith/hadithFullIngestion.js --bukhari-file bukhari.json \
     --muslim-file muslim.json --source-version v1.2.0 --usage-basis "hadith-json v1.2.0" --approved
   ```
   Add `--dry-run` to the translation, tafsir and hadith commands to validate files without API calls or writes.
3. **Vector index** on `knowledge_chunks`, once the collection has data (`knowledge_chunks_vector_index`: 1024 dimensions, cosine, filters on
   `metadata.approved`, `metadata.category`, `metadata.language`, `metadata.languages`):
   ```bash
   node src/modules/ai/rag/storage/vectorIndex.test.js   # creates the index, or reports it exists
   ```
4. **Accounts and source registry**: `npm run seed`.
5. **Start**: `npm run dev` (backend) and the frontend as in the quick start. `/api/health` shows `"ai":"real"`.
6. **Try it**: register a questioner, ask a question (examples in [docs/demo-script.md](docs/demo-script.md)), then
   log in as `khalid` to review the draft.

### Tests

```bash
cd server && npm run test:ai        # offline AI tests, no keys needed
cd server && npm run test:backend   # API integration tests (needs MONGODB_URI; uses the throw-away "bayyinah_test")
cd client && npm run lint && npm run build
```

Live end-to-end checks (use your keys and credit) are listed in [docs/testing.md](docs/testing.md).

### Deploy (Render)

[`render.yaml`](render.yaml) describes both services: the backend (`server/`, `npm ci`, `npm start`, health check
`/api/health`) and the static frontend (`client/`, `npm ci && npm run build`, publish `dist`, rewrite `/*` →
`/index.html`). Put the backend variables from [Keys and secrets](#keys-and-secrets) in the backend service's
*Environment* (`NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `SEED_PASSWORD`, `OPENAI_API_KEY`,
`VOYAGE_API_KEY`, `CLIENT_ORIGIN`) and `VITE_USE_MOCKS=false`, `VITE_API_BASE_URL=<backend URL>/api` in the
frontend's. Run `npm run seed` once against the production database.

## Repository

| Path | Contents |
|---|---|
| `client/` | React 19 + Vite + Tailwind frontend |
| `server/` | Express 5 API, MongoDB models, and the AI module (`server/src/modules/ai`) |
| `data/source-registry.json` | Approved sources |
| `scripts/seed-db.js` | Seeds accounts and the source registry |
| `docs/` | Architecture, AI workflow, API, sources, testing, demo script |

## Licences

- **Code**: MIT, see [LICENSE](LICENSE).
- **Source data** is not covered by the MIT licence; it stays under its providers' terms (Quranpedia.net usage
  terms; hadith-json as described in the source log).
- **Libraries**: React, React Router, TanStack Query, Vite, Tailwind CSS, Express, Mongoose, cors, jsonwebtoken,
  ESLint (MIT); MongoDB Node driver, OpenAI SDK, Google GenAI SDK (Apache-2.0); dotenv (BSD-2-Clause).
- **Fonts**: Amiri, IBM Plex Sans Arabic, Noto Naskh Arabic (SIL Open Font License 1.1, via Google Fonts).
- **Services**: OpenAI or Google Gemini, Voyage AI, MongoDB Atlas, Render, used under their terms of service.

## Known limitations

- The knowledge base holds the Qur'an, one English translation, one tafsir and the two Sahihs. Other references
  recommended by the challenge's scientific package (Bayyinat Q&A for objections, the islamic-content.com glossary,
  dorar.net) are not ingested yet; such questions get an abstention and the dāʿī answers.
- Classification is rule-based and can miss unusual wording; verification is done by a model and can be wrong,
  so the dāʿī's review remains the final check.
- Arabic and English only.
