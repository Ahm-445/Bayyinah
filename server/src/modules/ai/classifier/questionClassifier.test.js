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

// "should I / can I" is a personal-ruling request (Level D) only when the
// question is about a religious matter; an off-topic personal question abstains.
for (const text of ["Which phone should I buy?", "Can I use my wife's laptop?", "ماذا أفعل لأتعلم البرمجة؟"]) {
  const offTopic = classifyQuestion(text);
  assert.strictEqual(offTopic.action, "ABSTAIN", text);
  assert.strictEqual(offTopic.level, "A", text);
  assert.strictEqual(offTopic.risk, "low", text);
  assert.strictEqual(offTopic.category, "other", text);
}
for (const text of [
  "My father is not Muslim, can I attend his Christmas dinner?",
  "Should I pray Witr before sleeping?",
  "Can I eat gelatin?",
  "ماذا أفعل إذا فاتتني صلاة الفجر؟",
  "Is it permissible for me to do this?",
]) {
  const personal = classifyQuestion(text);
  assert.strictEqual(personal.level, "D", text);
  assert.strictEqual(personal.action, "REFER", text);
}
// "can i" no longer matches inside "can islam".
assert.strictEqual(classifyQuestion("Can Islam and science coexist?").action, "ANSWER");

console.log("Arabic question classifier tests: PASSED");
