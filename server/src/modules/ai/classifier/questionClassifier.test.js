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
assert.strictEqual(quranQuestion.category, "quran");

console.log("Arabic question classifier tests: PASSED");
