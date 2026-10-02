// Mirrors data/source-registry.json, in the GET /api/sources/:sourceId shape.
export const SOURCES = [
  {
    sourceId: 'quranpedia-quran-hafs',
    title: 'القرآن الكريم - حفص عن عاصم',
    domain: 'quran',
    url: 'https://quranpedia.net/',
    authorityLevel: 'primary',
    usageBasis:
      "Qur'an text listed as an approved reference (quranpedia.net) in the challenge scientific package.",
    active: true,
  },
  {
    sourceId: 'quranpedia-tafsir-book-1',
    title: 'تيسير التفسير',
    domain: 'tafsir',
    url: 'https://quranpedia.net/',
    authorityLevel: 'secondary',
    usageBasis: 'TO CONFIRM: tafsir book served via quranpedia.net.',
    active: true,
  },
]
