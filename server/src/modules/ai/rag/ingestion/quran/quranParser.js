const fs = require('fs');
const zlib = require('zlib');

function cleanAyahText(text) {
  if (typeof text !== 'string') throw new Error('Ayah text must be a string');
  // Quranpedia dump may contain a BOM at the beginning of an ayah.
  return text.replace(/^\uFEFF+/, '').trim();
}

function parseQuranpediaDump(filePath) {
  if (!filePath) throw new Error('Dump file path is required');
  const raw = zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8');
  const dump = JSON.parse(raw);

  if (!dump.license || !dump.license.source || !dump.license.version) {
    throw new Error('Invalid Quranpedia dump: license metadata is missing');
  }
  if (!dump.data || !Array.isArray(dump.data.surahs)) {
    throw new Error('Invalid Quranpedia dump: data.surahs is missing');
  }

  return dump;
}

function extractHafsAyahs(dump) {
  const mushaf = dump.data;
  if (mushaf.id !== 1) throw new Error(`Expected Hafs mushaf id 1, got ${mushaf.id}`);
  if (mushaf.surahs.length !== 114) {
    throw new Error(`Expected 114 surahs, got ${mushaf.surahs.length}`);
  }

  const ayahs = [];
  for (const surah of mushaf.surahs) {
    for (const ayah of surah.ayahs || []) {
      const surahNumber = Number(ayah.surah);
      const ayahNumber = Number(ayah.number);
      const text = cleanAyahText(ayah.text);

      if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
        throw new Error(`Invalid surah number for ayah id ${ayah.id}`);
      }
      if (!Number.isInteger(ayahNumber) || ayahNumber < 1) {
        throw new Error(`Invalid ayah number for ayah id ${ayah.id}`);
      }
      if (!text) throw new Error(`Empty text for ${surahNumber}:${ayahNumber}`);

      ayahs.push({
        id: ayah.id,
        surahNumber,
        surahName: surah.name,
        ayahNumber,
        pageNumber: ayah.page_number,
        text,
        marker: ayah.marker,
        juz: ayah.juz,
        hizb: ayah.hizb,
        ruku: ayah.ruku,
        manzil: ayah.manzil,
        numberInHafs: ayah.number_in_hafs,
      });
    }
  }

  if (ayahs.length !== 6236) {
    throw new Error(`Unexpected Hafs ayah count: ${ayahs.length}`);
  }

  return ayahs;
}

module.exports = { parseQuranpediaDump, extractHafsAyahs, cleanAyahText };
