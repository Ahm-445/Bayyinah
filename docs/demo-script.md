# Demo script

For the live demo and the 2-minute video. Live app: https://bayyinah-frontend.onrender.com
(the backend sleeps when idle on Render's free plan; open https://bayyinah-eteb.onrender.com/api/health first
and wait for `"status":"ok"`).

Accounts: register a new questioner on the site. Dāʿī accounts are created by `npm run seed`
(`khalid`, `maryam`; password = `SEED_PASSWORD`).

## 2-minute walkthrough

| Time | Screen | Say |
|---|---|---|
| 0:00 | Ask page (questioner) | A non-Muslim asks a question in their own language. Each answer is reviewed by a qualified dāʿī. |
| 0:15 | Ask "ما معنى التوحيد؟" | The AI classifies the question, retrieves evidence only from approved sources (Qur'an, tafsir, the two Sahihs) and drafts an answer. |
| 0:35 | Dāʿī queue (log in as `khalid`) | Every dāʿī receives the question with an AI draft, its level and its verification status. |
| 0:45 | Draft review | Inline references like (البقرة 2:163); evidence cards with "cited" markers and the hadith grade; the verification panel lists anything unsupported. |
| 1:05 | Edit and publish | The dāʿī edits, inserts a citation from the evidence panel and publishes. The AI never publishes. |
| 1:20 | Questioner: answers | The questioner compares the dāʿīs' answers and selects one; the dāʿī earns points. |
| 1:35 | Ask "Which phone should I buy?" and "My father is not Muslim, can I attend his Christmas dinner?" | Out of scope → no answer generated. Personal ruling → referred to a scholar, no AI draft. |
| 1:50 | Close | Answers that are sourced, reviewed by people, and honest about what the sources don't cover. |

## Questions that show each behaviour

| Question | Expected |
|---|---|
| ما معنى التوحيد؟ | Answer with tafsir and Qur'an references in Arabic |
| ماذا قال النبي عن الإحسان إلى الجار؟ | Hadith category, hadith evidence graded صحيح |
| Why do Muslims pray five times a day? | Plain-text English draft with references |
| ما فضل الصدق في الإسلام؟ | Arabic draft from all sources (Qur'an, tafsir, hadith), references such as (التوبة 9:119) |
| How should Muslims treat their parents? | English draft from all sources, e.g. (Al-Isra 17:23) and a hadith graded صحيح |
| Which phone should I buy? | ABSTAIN, no draft |
| My father is not Muslim, can I attend his Christmas dinner? | REFER, Level D, no draft |
| ما حكم هذه المسألة؟ اختلف العلماء فيها | Level C, draft flagged for review |
