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

## Run it locally

Requirements: Node.js 22, a MongoDB Atlas database (Vector Search is needed for real AI mode).

### Backend

```bash
cd server
npm install
cp ../.env.example .env    # set MONGODB_URI and JWT_SECRET; add OPENAI_API_KEY + VOYAGE_API_KEY for real AI
npm run seed               # dāʿī/admin accounts (khalid, maryam, admin) and the source registry
npm run dev                # http://localhost:5000/api/health
```

Without the AI keys the server starts in `AI_MODE=mock` with clearly labelled canned results.
Real AI mode also needs the knowledge base ingested into `knowledge_chunks`
(commands in [docs/source-registry.md](docs/source-registry.md#ingestion-commands)).

### Frontend

```bash
cd client
npm install
cp .env.example .env.local # VITE_USE_MOCKS=false to use the backend above
npm run dev                # http://localhost:5173 (proxies /api to localhost:5000)
```

With `VITE_USE_MOCKS=true` the frontend runs on an in-browser mock API with no backend.

### Tests

```bash
cd server && npm run test:ai        # 79 offline AI tests, no keys needed
cd server && npm run test:backend   # API integration tests (needs MONGODB_URI) + citation tests
cd client && npm run lint && npm run build
```

Live end-to-end checks are listed in [docs/testing.md](docs/testing.md).

### Deploy

`render.yaml` describes both services on Render: the backend (`server/`, `npm start`) and the static frontend
(`client/`, `npm run build`, rewrite `/*` → `/index.html`). Backend environment: `NODE_ENV=production`,
`MONGODB_URI`, `JWT_SECRET`, `SEED_PASSWORD`, `OPENAI_API_KEY`, `VOYAGE_API_KEY`, `CLIENT_ORIGIN`.

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
- The tafsir (تيسير التفسير) is a contemporary work from Quranpedia; the package's tafsir references are works of
  the first three centuries or dorar.net/tafseer.
- Classification is rule-based and can miss unusual wording; verification is done by a model and can be wrong,
  so the dāʿī's review remains the final check.
- Every dāʿī receives every question; routing by specialty is not built yet.
- Askers see the dāʿī's text and choice of answer, but not yet a documentation badge per answer.
- Arabic and English only.
