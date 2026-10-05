const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyQuestion } = require("./questionClassifier");
const { containsIndicator, normalizeText } = require("./textNormalizer");

const matches = (text, indicator) => containsIndicator(normalizeText(text), indicator);

test("the ruling word does not match inside 'wisdom'", () => {
  assert.equal(matches("ما الحكمة من خلق الإنسان؟", "حكم"), false);
  assert.equal(matches("ما الحكمة من الصيام؟", "حكم"), false);
});

test("the ruling word still matches its real forms", () => {
  assert.equal(matches("ما حكم الصلاة؟", "حكم"), true);
  assert.equal(matches("الحكم الشرعي للتدخين", "حكم"), true);
  assert.equal(matches("بحكم الشرع", "حكم"), true);
});

test("inflections without taa marbuta keep matching ('حديثًا' is still hadith)", () => {
  assert.equal(matches("هل يمكنك أن تعطيني حديثًا عن النية؟", "حديث"), true);
  assert.equal(matches("الطب الحديثة", "حديث"), false);
});

test("Latin indicators keep the plain substring match", () => {
  assert.equal(matches("What is the ruling on music?", "ruling"), true);
});

test("questions about wisdom are not classified as disputed fiqh", () => {
  for (const question of [
    "ما الحكمة من خلق الإنسان؟",
    "ما الحكمة من الصيام؟",
    "ما الحكمة من تحريم الخمر؟",
  ]) {
    const result = classifyQuestion(question);

    assert.notEqual(result.category, "fiqh", question);
    assert.notEqual(result.level, "C", question);
    assert.equal(result.risk, "low", question);
  }
});

test("real rulings are still level C fiqh and personal cases are still referred", () => {
  for (const question of [
    "ما حكم الصلاة؟",
    "ما هو حكم الربا؟",
    "اختلف العلماء في حكم الموسيقى",
  ]) {
    const result = classifyQuestion(question);

    assert.equal(result.category, "fiqh", question);
    assert.equal(result.level, "C", question);
  }

  const personal = classifyQuestion("هل يجوز لي أن أطلق زوجتي؟");
  assert.equal(personal.level, "D");
  assert.equal(personal.action, "REFER");
});
