# Bayyinah demo flow

## Start the demo

1. Configure the server's existing environment variables and connect it to the demo MongoDB database.
2. In `server/`, run `npm run dev`.
3. In `client/`, run `npm run dev`.
4. Open the Vite address. The client proxies `/api` to the backend at `http://127.0.0.1:5000`.

The demo uses the existing AI orchestrator. Submitting a real question can call the configured AI provider and incur usage charges.

## Seeker flow

1. Enter a question (or use an example) and submit it.
2. The page shows the AI action, classification, safety decision, verification status, and any prepared draft. Quran references appear inside the draft text, generated from retrieved verse metadata.
3. An eligible `ANSWER` result appears as a draft labeled `pending review` and `Published: no`.
4. `ABSTAIN`, `REFER`, blocked, clarification, and ineligible verification results appear as distinct outcomes, not successful answers. Completed results are visible in the Da‘i review queue; only eligible `ANSWER` drafts can be published.

## Da‘i review and publication

1. Select **Da‘i review** to load the pending draft queue.
2. Inspect the question, AI action, classification, safety decision, answer when present, retrieved evidence, and verification notes when present.
3. Approve or reject an eligible `ANSWER` draft. If it is not publishable, mark the result reviewed. If the backend indicates warnings, risk flags, a `REVIEW` safety decision, or `NEEDS_REVIEW` verification, acknowledge the notes before approval.
4. On approval, the answer moves to `published` and the seeker view can fetch it through the published-answer endpoint. Other actions and rejected results remain unpublished.

The current classifier/orchestrator accepts `CLARIFY` as a valid result action but does not emit it yet.

This is a demo workflow only. There is no authentication or reviewer identity, so do not expose these endpoints publicly.
