# Bayyinah – بيّنة

Bayyinah is an AI-assisted platform connecting people seeking answers about Islam with qualified Islamic educators (Du'at).

## Project Structure

- client/ - React frontend
- server/ - Node.js backend
- data/ - approved source registry, seed data and fixtures
- scripts/ - database and evaluation scripts
- docs/ - architecture, AI, RAG, verification and testing documentation

## Core AI Pipeline

Question
→ Classification
→ Safety / Risk Check
→ RAG Retrieval
→ Evidence Sufficiency
→ Draft Generation
→ Citation Verification
→ Evidence Verification
→ Safety Gate
→ Da'i Review
→ Publish

## Stack

- React
- Node.js / Express
- MongoDB
- RAG
- LLM

## Running the backend

```bash
cd server
npm install
cp ../.env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm run seed              # dāʿī/admin accounts and the source registry
npm run dev               # http://localhost:5000/api/health
npm test                  # integration tests (throw-away database "bayyinah_test")
```

Without OpenAI/Voyage keys the server starts in `AI_MODE=mock` (canned, clearly labelled results), so the frontend can be developed without them. See [docs/api.md](docs/api.md) for the full API, the AI contract and data ownership.
