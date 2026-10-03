# Bukhari and Muslim ingestion

The parser reads the provided by-book JSON format for Sahih al-Bukhari and Sahih Muslim. It preserves each hadith as one bilingual retrieval chunk, indexes the collection's in-book hadith number, and carries both language codes so Arabic and English queries can retrieve the same record. Muslim chapter `0` is retained as its introduction chapter; missing English text is retained as Arabic-only evidence. Re-running ingestion reads existing chunk IDs and embeds only missing records; it does not delete chunks.

Embedding requests retry transient connection errors, HTTP 429, and HTTP 5xx errors up to five times with exponential delays of 1, 2, 4, 8, and 16 seconds. Permanent errors fail without retry. An exhausted batch fails before writing any record from that batch and reports its hadith range and remaining count.

The repository README recommends pinning downloads to a release tag because `main` can change. These local JSON files do not identify their repository commit or tag, and the repository has no explicit dataset license. The importer therefore allows a local dry run without approval, but requires an explicit `--approved`, `--usage-basis`, and `--source-version` before any embedding or MongoDB write. Confirm the usage rights and that both files match the version you pass.

Validate the supplied files and read MongoDB to calculate which chunks are still missing. Dry-run performs no embedding API calls and makes no MongoDB writes:

```bash
node src/modules/ai/rag/ingestion/hadith/hadithFullIngestion.js \
  --bukhari-file "/path/to/bukhari.json" \
  --muslim-file "/path/to/muslim.json" \
  --dry-run
```

After confirming rights and version, run ingestion with the confirmed basis and tag or commit:

```bash
node src/modules/ai/rag/ingestion/hadith/hadithFullIngestion.js \
  --bukhari-file "/path/to/bukhari.json" \
  --muslim-file "/path/to/muslim.json" \
  --source-version "<verified tag or commit>" \
  --usage-basis "<verified usage terms>" \
  --approved
```

The ingestion upserts into `knowledge_chunks` using stable collection-specific chunk IDs. The dataset supplies no hadith grade field, so the importer does not create or infer one.
