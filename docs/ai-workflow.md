# AI workflow

The AI module (`server/src/modules/ai`) exposes one function, `processQuestion({ questionId, text })`.
It prepares a **draft for a dāʿī**; it never answers the questioner directly and never publishes.
Its result shape is fixed in [api.md](api.md) section 5.

```
question ─► 1 classify ─► 2 safety gate ─► 3 retrieve ─► 4 sufficiency ─► 5 generate ─► 6 verify ─► draft for the dāʿī
              │               │                              │                 │              │
              │               └─ Level D ─► REFER (no draft)  └─ too weak ─► ABSTAIN          └─ FAIL ─► ABSTAIN (draft kept for review)
              └─ personal question with no religious subject ─► ABSTAIN (no retrieval)
```

## 1. Classification (deterministic, no model call)

`classifier/` uses keyword rules on normalised text (Arabic diacritics and alef forms folded) to set:

- **Language** (`ar` / `en`) from the question text. The draft is written in the same language.
- **Category**: `quran`, `hadith`, `tafsir`, `aqeedah`, `fiqh`, `seerah_history`, `objections`, `terminology`,
  `translation`, `general_islam`, `other`. The category limits which source types retrieval may use.
- **Level**, following the content levels of the challenge's scientific package:

| Level | Meaning | Handling |
|---|---|---|
| A | Stable foundational information | Answer with sources |
| B | Explanation, definition, reasoning | Answer with sources, avoid certainty where scholars differ |
| C | Disputed or high-sensitivity issue | Draft is generated but flagged for review (`safety.decision = REVIEW`) |
| D | Personal fatwa or individual case | **Refer**: no draft is generated; the question goes to the dāʿīs as a referral |

"Should I / can I / my wife…" counts as Level D only when the question has a religious subject.
A personal question with nothing religious in it ("Which phone should I buy?") is out of scope: **ABSTAIN**.

## 2. Safety gate

`safety/safetyGate.js` turns the classification into a decision: Level D → `BLOCK` (refer), Level C or an
out-of-scope question → `REVIEW`, otherwise `ALLOW`.

## 3. Retrieval (RAG)

- Approved sources are chunked and embedded at ingestion time into `knowledge_chunks`
  (Voyage `voyage-4-large`, 1024 dimensions, cosine) with an Atlas Vector Search index.
- The question is embedded the same way; the retriever returns the top 3 chunks (50 candidates), filtered to
  approved sources, to the source types the category allows, and to Arabic/English chunks.
- When the question names a source type ("from the Quran", "a hadith", "tafsir", "translation"), that type is
  **required**: if it is missing or too weak, the result is ABSTAIN instead of an answer from other sources.
- Hadith evidence carries its grade. All hadith come from Sahih al-Bukhari and Sahih Muslim, so the grade is "صحيح".

## 4. Evidence sufficiency

At least one chunk must score 0.7 or higher. Otherwise the result is **ABSTAIN** with the evidence that was found,
and the dāʿī writes the answer.

## 5. Draft generation

`generator/draftGenerator.js` with `prompts/generationPrompt.js`. Model: OpenAI `gpt-5.4-mini` by default
(Gemini `gemini-3.1-flash-lite` with `LLM_PROVIDER=gemini`), temperature 0.2.

The prompt requires, among others: use only the supplied evidence; no invented facts, quotations or references;
say when evidence is insufficient; no personal fatwa; keep source text distinct from explanation; never present a
disputed issue as agreed; answer in the question's language; respectful tone for non-Muslims; readable inline
references such as `(الإخلاص 112:1)` / `(Al-Ikhlas 112:1)`; plain text; no closing offers or unsupported summary;
Arabic answers never quote English translation text.

Every draft is checked before it is accepted, and asked for again once if a check fails:

- it must be in the question's language;
- every verse reference must be a verse present in the evidence (including verses listed in a tafsir chunk's
  references, e.g. "Quran 3:130–3:133"). An invented verse is rejected.

## 6. Verification

Two independent checks, combined in `verifier/verificationCombiner.js`:

1. **Citation verification** (`citationVerifier.js`): every citation must point to a retrieved evidence chunk.
2. **Claim-level evidence verification** (`evidenceVerifierService.js`): the draft is split into sentences;
   a second model call marks each sentence as factual or not and, for factual ones, which evidence supports it.
   Unsupported quotations, wrong or invented citations or attributions, and unsupported rulings fail.

| Status | Meaning |
|---|---|
| `PASS` | Every factual sentence is supported and every citation is traceable |
| `NEEDS_REVIEW` | Supported overall, with a warning (e.g. one unsupported plain explanatory sentence) |
| `FAIL` | Unsupported claims, invented or wrong citations, or no supported claim at all |

A `FAIL` draft is kept and shown to the dāʿī with the reasons, marked as failed.

## After the AI: the dāʿī decides

The dāʿī sees the draft, the evidence (with "cited" markers and hadith grades), the verification result and the
safety decision. Publishing anything that is not `ANSWER` + `PASS` requires acknowledging the warnings.
Only published answers reach the questioner.

## Limits

- Classification is rule-based; unusual wording can be categorised as `other`.
- Retrieval uses only the sources in [source-registry.md](source-registry.md); questions outside them abstain.
- Verification is done by a model and can be wrong in both directions; the dāʿī's review is the final check.
