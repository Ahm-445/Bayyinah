const aiModule = require("../modules/ai");

function createAIService({ processQuestion = aiModule.processQuestion } = {}) {
  return {
    answerQuestion(input) {
      return processQuestion(input);
    },
  };
}

module.exports = { createAIService };
