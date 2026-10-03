// Plain-text source references the dāʿī puts inside the answer,
// e.g. "(Adh-Dhariyat 51:56)". No markers, no backend dependency.

// Transliterated surah names, index = surah number - 1.
export const SURAH_NAMES = [
  'Al-Fatihah', 'Al-Baqarah', "Ali 'Imran", 'An-Nisa', "Al-Ma'idah", "Al-An'am", "Al-A'raf",
  'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf', "Ar-Ra'd", 'Ibrahim', 'Al-Hijr', 'An-Nahl',
  'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', "Al-Mu'minun", 'An-Nur',
  'Al-Furqan', "Ash-Shu'ara", 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum', 'Luqman',
  'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
  'Fussilat', 'Ash-Shura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad',
  'Al-Fath', 'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman',
  "Al-Waqi'ah", 'Al-Hadid', 'Al-Mujadilah', 'Al-Hashr', 'Al-Mumtahanah', 'As-Saff',
  "Al-Jumu'ah", 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam',
  'Al-Haqqah', "Al-Ma'arij", 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah',
  'Al-Insan', 'Al-Mursalat', 'An-Naba', "An-Nazi'at", 'Abasa', 'At-Takwir', 'Al-Infitar',
  'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', "Al-A'la", 'Al-Ghashiyah', 'Al-Fajr',
  'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr',
  'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat', "Al-Qari'ah", 'At-Takathur', 'Al-Asr',
  'Al-Humazah', 'Al-Fil', 'Quraysh', "Al-Ma'un", 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
  'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
]

const QURAN_CHUNK = /^quran-hafs-(\d+)-(\d+)$/
const TAFSIR_CHUNK = /^tafsir-book-1-(\d+)-(\d+)$/

/** { surah, ayah, tafsir } for verse-based evidence, else null. */
function verseOf(evidence) {
  const tafsir = evidence.chunkId?.match(TAFSIR_CHUNK)
  if (tafsir) return { surah: Number(tafsir[1]), ayah: Number(tafsir[2]), tafsir: true }
  const quran = evidence.chunkId?.match(QURAN_CHUNK)
  const surah = Number(evidence.surahNumber ?? quran?.[1])
  const ayah = Number(evidence.ayahNumber ?? quran?.[2])
  if (!surah || !ayah) return null
  return { surah, ayah, tafsir: evidence.sourceType === 'tafsir' }
}

// Arabic surah names, index = surah number - 1.
export const SURAH_NAMES_AR = [
  'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة',
  'يونس', 'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
  'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت',
  'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
  'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
  'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر',
  'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم',
  'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات',
  'النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق',
  'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق',
  'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل',
  'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس',
]

/**
 * Readable reference to insert into the answer, in the QUESTION's language
 * (not the UI language): "(Adh-Dhariyat 51:56)" or "(الذاريات 51:56)".
 */
export function readableReference(evidence, language = 'en') {
  const verse = verseOf(evidence)
  if (!verse) return `(${evidence.reference ?? evidence.sourceTitle ?? evidence.chunkId})`
  const arabic = language === 'ar'
  const name = (arabic ? SURAH_NAMES_AR : SURAH_NAMES)[verse.surah - 1] ?? `${arabic ? 'سورة' : 'Surah'} ${verse.surah}`
  const ref = `${name} ${verse.surah}:${verse.ayah}`
  if (!verse.tafsir) return `(${ref})`
  return arabic ? `(تفسير ${ref})` : `(Tafsir on ${ref})`
}

/**
 * Whether `text` mentions this evidence: its verse key ("51:56", not "151:56"
 * or "51:567"), or for non-verse sources its full readable reference.
 */
export function isCitedIn(text, evidence) {
  if (!text) return false
  const verse = verseOf(evidence)
  if (!verse) return text.includes(readableReference(evidence))
  return new RegExp(`(^|[^\\d:])${verse.surah}:${verse.ayah}(?!\\d)`).test(text)
}
