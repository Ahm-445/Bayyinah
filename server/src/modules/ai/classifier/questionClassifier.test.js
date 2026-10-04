const assert = require("assert");
const { classifyQuestion } = require("./questionClassifier");

const personalQuestion = classifyQuestion(
  "فِي حَالَتِي، هَلْ يَجُوزُ لِي فعل ذلك؟"
);

assert.strictEqual(personalQuestion.level, "D");
assert.strictEqual(personalQuestion.action, "REFER");

const disputedQuestion = classifyQuestion(
  "ما حكم هذه المسألة؟ اختلف العلماء فيها"
);

assert.strictEqual(disputedQuestion.level, "C");
assert.strictEqual(disputedQuestion.category, "fiqh");

const quranQuestion = classifyQuestion("ما معنى هذه الآية من القرآن؟");
assert.strictEqual(quranQuestion.category, "tafsir");
assert.strictEqual(quranQuestion.language, "ar");

const arabicGeneralIslamQuestion = classifyQuestion("ما هو الإسلام؟");
const englishGeneralIslamQuestion = classifyQuestion("What is Islam?");
for (const classification of [arabicGeneralIslamQuestion, englishGeneralIslamQuestion]) {
  assert.strictEqual(classification.category, "general_islam");
  assert.strictEqual(classification.level, "A");
  assert.strictEqual(classification.risk, "low");
  assert.strictEqual(classification.action, "ANSWER");
}

const languageAndIntentCases = [
  ["ماذا يقول القرآن عن الصبر وقت الشدائد؟", "ar", "quran"],
  ["What does the Quran say about patience during difficult times?", "en", "quran"],
  ["هل يمكنك أن تعطيني حديثًا عن النية؟", "ar", "hadith"],
  ["Can you give me a hadith about intentions in Islam?", "en", "hadith"],
  ["ما تفسير بداية سورة الفاتحة؟", "ar", "tafsir"],
  ["What does the beginning of Surah Al-Fatihah mean?", "en", "tafsir"],
  ["أعطني الآية الأولى من سورة الفاتحة", "ar", "quran"],
  ["Show me the first verse of Al-Fatihah", "en", "quran"],
  ["اشرح لي أهمية التوحيد باستخدام القرآن وحديث", "ar", "aqeedah"],
  ["Explain the importance of Tawhid using the Quran and a hadith.", "en", "aqeedah"],
  ["How do I write a Python REST API?", "en", "other"],
  ["أنا وزوجتي لدينا مشاكل زوجية، هل يجوز لي أن أطلقها؟", "ar", "fiqh"],
  ["ما معنى بداية سورة الفاتحة؟", "ar", "tafsir"],
  ["اشرح لي معنى الآية الأولى من الفاتحة", "ar", "tafsir"],
  ["ما تفسير سورة الفاتحة؟", "ar", "tafsir"],
  ["لماذا قالت الآية كذا؟", "ar", "tafsir"],
  ["Explain the first verse of Al-Fatihah", "en", "tafsir"],
  ["What is the tafsir of Surah Al-Fatihah?", "en", "tafsir"],
  ["Why does this verse say this?", "en", "tafsir"],
  ["ما نص الآية الأولى من الفاتحة؟", "ar", "quran"],
  ["What is the Quran verse 1:1?", "en", "quran"],
];
for (const [text, language, category] of languageAndIntentCases) {
  const classification = classifyQuestion(text);
  assert.strictEqual(classification.language, language, text);
  assert.strictEqual(classification.category, category, text);
}
assert.strictEqual(classifyQuestion("ما تفسير بداية سورة الفاتحة؟").level, "B");

console.log("Arabic question classifier tests: PASSED");
