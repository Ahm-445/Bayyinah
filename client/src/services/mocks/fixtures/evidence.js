// Evidence items in the exact shape the real retriever emits
// (server/src/modules/ai/rag/retrieval/vectorRetriever.js): citation has
// sourceId, chunkId and reference only. sourceTitle is not set by the
// retriever, and there are no surah/ayah numbers.

const QURAN = 'quranpedia-quran-hafs'

function ayah(surahName, surahNumber, ayahNumber, text, score) {
  const chunkId = `quran-hafs-${surahNumber}-${ayahNumber}`
  return {
    sourceId: QURAN,
    chunkId,
    text,
    score,
    citation: { sourceId: QURAN, chunkId, reference: `${surahName}، الآية ${ayahNumber}` },
  }
}

export const EVIDENCE = {
  ikhlas1: ayah('الإخلاص', 112, 1, 'قُلْ هُوَ اللَّهُ أَحَدٌ', 0.91),
  ikhlas2: ayah('الإخلاص', 112, 2, 'اللَّهُ الصَّمَدُ', 0.88),
  ikhlas3: ayah('الإخلاص', 112, 3, 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 0.86),
  ikhlas4: ayah('الإخلاص', 112, 4, 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', 0.84),
  dhariyat56: ayah('الذاريات', 51, 56, 'وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ', 0.89),
  hujurat13: ayah(
    'الحجرات',
    49,
    13,
    'يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا ۚ إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ ۚ إِنَّ اللَّهَ عَلِيمٌ خَبِيرٌ',
    0.9,
  ),
  anbiya107: ayah('الأنبياء', 21, 107, 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ', 0.87),
}

/** Same evidence with a lower score (for the insufficient-evidence case). */
export function weak(item, score) {
  return { ...item, score }
}

/** Draft citations as the generator builds them (draftGenerator.js). */
export function citationsFor(evidence) {
  return evidence.map((item) => ({
    sourceId: item.sourceId,
    chunkId: item.chunkId,
    sourceTitle: item.citation.sourceTitle ?? null,
    reference: item.citation.reference ?? null,
  }))
}
