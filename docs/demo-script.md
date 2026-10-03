# Bayyinah demo flow

## Start the demo

1. Configure the server's existing environment variables and connect it to the demo MongoDB database.
2. In `server/`, run `npm run dev`.
3. In `client/`, run `npm run dev`.
4. Open the Vite address. The client proxies `/api` to the backend at `http://127.0.0.1:5000`.

The demo uses the existing AI orchestrator. Submitting a real question can call the configured AI provider and incur usage charges.

## Seeker flow

1. Enter a question (or use an example) and submit it.
2. The page shows the AI action, classification, safety decision, verification status, evidence citations, and any prepared draft.
3. Only an eligible `ANSWER` result appears as a draft. It is labeled `pending review` and `Published: no`.
4. `ABSTAIN`, `REFER`, blocked, clarification, and ineligible verification results are shown as distinct outcomes, not as successful answers.

## Da‘i review and publication

1. Select **Da‘i review** to load the pending draft queue.
2. Inspect the question, classification, safety decision, answer, citations, retrieved evidence, and verification notes.
3. Reject the draft, or approve it. If the backend indicates warnings, risk flags, a `REVIEW` safety decision, or `NEEDS_REVIEW` verification, acknowledge the notes before approval.
4. On approval, the draft moves to `published` and the seeker view can fetch the approved answer through the published-answer endpoint. Rejected drafts remain unpublished.

This is a demo workflow only. There is no authentication or reviewer identity, so do not expose these endpoints publicly.
