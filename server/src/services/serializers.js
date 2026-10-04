// API shapes (docs/api.md, part 2). Internal fields never leave the server.

const id = (value) => (value == null ? null : String(value));

function userView(user) {
  return {
    id: id(user._id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

function questionView(question) {
  return {
    id: id(question._id),
    text: question.text,
    language: question.language,
    status: question.status,
    classification: question.classification?.level
      ? {
          category: question.classification.category ?? null,
          level: question.classification.level,
        }
      : null,
    createdAt: question.createdAt,
  };
}

/** What the questioner sees: no verification, no evidence, no AI details. */
function answerView(answer, daee) {
  return {
    id: id(answer._id),
    daee: {
      id: id(answer.daeeId),
      displayName: daee?.displayName ?? "Dāʿī",
    },
    finalText: answer.finalText,
    citations: answer.citations ?? [],
    publishedAt: answer.publishedAt,
  };
}

function draftView(draft) {
  return {
    id: id(draft._id),
    status: draft.status,
    question: {
      id: id(draft.questionId),
      text: draft.question?.text ?? "",
      language: draft.question?.language ?? "en",
      classification: {
        category: draft.classification?.category ?? null,
        level: draft.classification?.level ?? null,
        risk: draft.classification?.risk ?? null,
      },
    },
    aiAction: draft.aiAction,
    safety: draft.safety ?? null,
    generatedText: draft.generatedText ?? null,
    text: draft.text ?? "",
    versions: (draft.versions ?? []).map((version) => ({
      text: version.text,
      editedAt: version.editedAt,
      editedBy: id(version.editedBy),
    })),
    evidence: draft.evidence ?? [],
    citations: draft.citations ?? [],
    verification: draft.verification ?? null,
    requiresAcknowledgement: Boolean(draft.requiresAcknowledgement),
    pipeline: draft.pipeline ?? [],
  };
}

function queueItem(draft) {
  return {
    draftId: id(draft._id),
    questionId: id(draft.questionId),
    questionText: draft.question?.text ?? "",
    level: draft.classification?.level ?? null,
    aiAction: draft.aiAction,
    verificationStatus: draft.verification?.status ?? null,
    status: draft.status,
    createdAt: draft.createdAt,
  };
}

function sourceView(source) {
  return {
    sourceId: source.sourceId,
    title: source.title,
    domain: source.domain,
    url: source.url ?? null,
    author: source.author ?? null,
    authorityLevel: source.authorityLevel ?? null,
    language: source.language ?? null,
    version: source.version ?? null,
    license: source.license ?? null,
    usageBasis: source.usageBasis,
    active: source.active,
  };
}

module.exports = {
  userView,
  questionView,
  answerView,
  draftView,
  queueItem,
  sourceView,
};
