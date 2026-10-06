# Source log

The only knowledge the AI may use. The registry lives in [`data/source-registry.json`](../data/source-registry.json),
is loaded into `app_sources` by `npm run seed`, and the retriever only returns chunks whose source is approved.
An admin can deactivate a source in the registry (`PATCH /api/sources/:sourceId`).

## Sources

| Source | Domain | Language | Version | Provider / licence | Used for |
|---|---|---|---|---|---|
| القرآن الكريم – حفص عن عاصم (`quranpedia-quran-hafs`) | Qur'an | ar | 2026-09-30 | [Quranpedia.net](https://quranpedia.net/) dump; free in-app use, attribution and version required when republishing the data | Verse text, quoted verbatim |
| Saheeh International (`quran-translation-1947`) | Qur'an translation | en | 2026-10-02 | Quranpedia.net dump; in-app use permitted, attribution required for republished datasets | Meaning of verses for English answers |
| جامع البيان في تأويل آي القرآن – محمد بن جرير الطبري، ت 310هـ (`quranpedia-tafsir-book-4`) | Tafsir | ar | 2026-10-02 | [Quranpedia.net book 4](https://quranpedia.net/book/4) dump (al-Risāla edition); free in-app use, credit and version required when republishing | Explaining verses, kept separate from the Qur'anic text |
| Sahih al-Bukhari (`ahmedbaset-hadith-bukhari`) | Hadith | ar + en | v1.2.0 | [AhmedBaset/hadith-json](https://github.com/AhmedBaset/hadith-json/tree/v1.2.0) (states it is scraped from Sunnah.com; no explicit dataset licence) | Hadith text, grade "صحيح" |
| Sahih Muslim (`ahmedbaset-hadith-muslim`) | Hadith | ar + en | v1.2.0 | same as above | Hadith text, grade "صحيح" |

The challenge's scientific package lists Quranpedia (Qur'an text and its translations), tafsir from the first three
centuries, and the two Sahihs as approved references; al-Ṭabarī died in 310 AH. The full usage basis of each source is
in the registry file.

Retired: تيسير التفسير – إبراهيم القطان (`quranpedia-tafsir-book-1`), a contemporary tafsir used in the first version.
It stays in the registry with `active: false`, so the retriever no longer uses it; its chunks are not deleted.

## How each source is used

- **Qur'an**: one chunk per verse with surah and ayah numbers. Quotations must be verbatim; references use the
  surah name and number, e.g. `(الإخلاص 112:1)`.
- **Translation**: one chunk per verse. Used to explain meaning; an Arabic answer never quotes the English wording.
- **Tafsir**: one chunk per tafsir passage (passages over 4,500 characters are split at paragraph or sentence
  boundaries), with the verses it explains in `reference` / `references` (e.g. "Quran 3:130–3:133").
  Al-Ṭabarī's words are presented as explanation, never as Qur'an.
- **Hadith**: one bilingual chunk per hadith with collection, number, chapter and a link to Sunnah.com.
  A hadith is never attributed without its collection, number and grade.

## How they are verified

At ingestion:

- Each importer parses and validates the dump before embedding. The translation and hadith importers refuse to
  write without an explicit approval, usage basis and version (`--approved`, `--usage-basis`, `--source-version`);
  the translation, tafsir and hadith importers support `--dry-run` (no API calls, no writes).
- Chunk ids are stable (`quran-hafs-112-1`, `ahmedbaset-hadith-muslim-38`, …), so re-running only adds missing chunks.

At answer time:

- Every verse reference in a draft must be a verse present in the retrieved evidence, or the draft is rejected.
- Every citation must point to a retrieved chunk, and every factual sentence is checked against the evidence
  (see [ai-workflow.md](ai-workflow.md)).
- When a dāʿī publishes, the answer stores exactly which chunks its text cites.

## Ingestion commands

Run from `server/` with `MONGODB_URI` and `VOYAGE_API_KEY` in `server/.env`. The Qur'an and book 1 dumps are in
`server/data/`; download the others from the providers above.

```bash
# Qur'an (Hafs): reads data/quran/mushafs-1.json.gz (https://api.quranpedia.net/dumps/mushafs-1.json.gz)
node src/modules/ai/rag/ingestion/quran/quranFullIngestion.js

# Saheeh International
node src/modules/ai/rag/ingestion/translations/saheehInternationalFullIngestion.js \
  --file <dump> --source-url https://quranpedia.net/ --source-version <version> --usage-basis "<terms>" --dry-run

# Tafsir al-Tabari (Quranpedia book 4)
curl -o data/tafsir/tafsir-book-4.json.gz https://api.quranpedia.net/dumps/tafsir-book-4.json.gz
node src/modules/ai/rag/ingestion/tafsir/tafsirFullIngestion.js --book 4 --dry-run

# Bukhari and Muslim: see src/modules/ai/rag/ingestion/hadith/README.md
npm run ingest:hadith:dry-run -- --bukhari-file <file> --muslim-file <file>
```

Remove `--dry-run` (and add the approval flags where required) to write. After ingesting al-Ṭabarī, apply the
registry's `active` flags (retires book 1): `npm run seed -- --sync-active`.

## Not yet included

Other references recommended by the scientific package are not ingested yet: the Bayyinat Q&A book
(dawa.center/file/7937) for common objections, the islamic-content.com glossary for translating terms,
and dorar.net encyclopaedias. Questions that need them abstain rather than answer from memory.
