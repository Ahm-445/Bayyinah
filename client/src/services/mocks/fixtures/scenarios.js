import { EVIDENCE as E, citationsFor, weak } from './evidence.js'

// Raw backend shapes (docs/api.md). Fields starting with "_" are mock-internal
// bookkeeping and are stripped before a response leaves the adapter.
//
// Draft scenarios for usr_daee_1 (the main demo account):
//   drf_1  level A, ANSWER, PASS            → in_review, approvable
//   drf_2  level B, ANSWER, NEEDS_REVIEW    → in_review, needs acknowledgeWarnings
//   drf_3  ABSTAIN before generation        → blocked, no draft, verification null
//   drf_4  ABSTAIN after citation FAIL      → blocked, draft present
//   drf_5  level D, REFER                   → blocked, referral view
//   drf_6  CLARIFY (no backend rule yet)    → neutral "needs clarification"
//   drf_7  already approved                 → published as ans_1
// q_2 has two published answers (ans_1, ans_2) for the compare screen.

const t = (day, time) => `2026-10-0${day}T${time}:00.000Z`

function classification(category, level, risk, action) {
  return { category, level, risk, action, reasons: [] }
}

function question(id, text, cls, status, createdAt) {
  // _sessionId null = seeded demo question, readable from any session.
  return { id, text, language: 'en', status, classification: cls, createdAt, _sessionId: null }
}

const PASS = {
  status: 'PASS',
  citationValid: true,
  evidenceSupported: true,
  unsupportedClaims: [],
  missingCitations: [],
  riskFlags: [],
  warnings: [],
}

export const QUESTIONS = [
  question('q_1', 'Who is God in Islam?', classification('aqeedah', 'A', 'low', 'ANSWER'), 'awaiting_review', t(4, '09:10')),
  question('q_2', 'What is the purpose of life in Islam?', classification('aqeedah', 'A', 'low', 'ANSWER'), 'answered', t(4, '08:30')),
  question('q_3', 'Does Islam teach that all people are equal?', classification('general_islam', 'B', 'medium', 'ANSWER'), 'awaiting_review', t(4, '09:25')),
  question('q_4', 'What does Islam say about the age of the universe?', classification('general_islam', 'B', 'low', 'ANSWER'), 'awaiting_review', t(4, '09:40')),
  question('q_5', "What was the mission of Prophet Muhammad according to the Qur'an?", classification('seerah_history', 'A', 'low', 'ANSWER'), 'awaiting_review', t(4, '09:55')),
  question('q_6', 'My father is not Muslim. Am I allowed to attend his holiday dinner?', classification('fiqh', 'D', 'high', 'REFER'), 'referred', t(4, '10:05')),
  question('q_7', 'What about the thing in that chapter?', classification('other', 'A', 'low', 'CLARIFY'), 'awaiting_review', t(4, '10:15')),
]

function draft(fields) {
  const { questionId, daeeId = 'usr_daee_1', ...rest } = fields
  const q = QUESTIONS.find((item) => item.id === questionId)
  const text = rest.generatedText
  return {
    question: {
      id: q.id,
      text: q.text,
      language: q.language,
      classification: { category: q.classification.category, level: q.classification.level, risk: q.classification.risk },
    },
    safety: { decision: 'ALLOW', reason: 'Question is within approved scope.' },
    text,
    versions: text ? [{ text, editedAt: q.createdAt }] : [],
    citations: [],
    requiresAcknowledgement: false,
    ...rest,
    _daeeId: daeeId,
    _createdAt: q.createdAt,
  }
}

const ikhlas = [E.ikhlas1, E.ikhlas2, E.ikhlas3, E.ikhlas4]
const IKHLAS_TEXT =
  'In Islam, God (Allah in Arabic) is One, with no partner and no equal. The Qur\'an summarises this in a short chapter, Surat al-Ikhlas: God is One (112:1), the One on whom all depend while He depends on no one (112:2), He neither begets nor was begotten (112:3), and nothing is comparable to Him (112:4). This belief in the absolute oneness of God, called tawhid, is the foundation of the Islamic faith.'

export const DRAFTS = [
  draft({
    id: 'drf_1',
    questionId: 'q_1',
    status: 'in_review',
    aiAction: 'ANSWER',
    generatedText: IKHLAS_TEXT,
    evidence: ikhlas,
    citations: citationsFor(ikhlas),
    verification: PASS,
  }),
  // Every assigned dāʿī gets their own copy (docs/api.md 2.3).
  draft({
    id: 'drf_1b',
    questionId: 'q_1',
    daeeId: 'usr_daee_2',
    status: 'in_review',
    aiAction: 'ANSWER',
    generatedText: IKHLAS_TEXT,
    evidence: ikhlas,
    citations: citationsFor(ikhlas),
    verification: PASS,
  }),
  draft({
    id: 'drf_2',
    questionId: 'q_3',
    status: 'in_review',
    aiAction: 'ANSWER',
    safety: { decision: 'REVIEW', reason: 'Medium-risk topic: dāʿī review recommended.' },
    generatedText:
      "The Qur'an addresses all of humanity and states that people were created from a male and a female and made into nations and tribes so that they may know one another. It adds that the most honoured of people in the sight of God is the most righteous (49:13). Islam therefore teaches that no race or nation is superior by birth, and that people are distinguished only by their piety and conduct.",
    evidence: [E.hujurat13],
    citations: citationsFor([E.hujurat13]),
    verification: {
      ...PASS,
      status: 'NEEDS_REVIEW',
      warnings: [
        'The final sentence generalises beyond the cited verse; consider adding supporting evidence or softening the wording.',
      ],
    },
    requiresAcknowledgement: true,
  }),
  draft({
    id: 'drf_3',
    questionId: 'q_4',
    status: 'blocked',
    aiAction: 'ABSTAIN',
    safety: { decision: 'REVIEW', reason: 'Retrieved evidence is insufficient for generation.' },
    generatedText: null,
    evidence: [weak(E.dhariyat56, 0.41), weak(E.anbiya107, 0.38)],
    verification: null,
  }),
  draft({
    id: 'drf_4',
    questionId: 'q_5',
    status: 'blocked',
    aiAction: 'ABSTAIN',
    generatedText:
      "The Qur'an describes the mission of Prophet Muhammad as a mercy to all the worlds (21:107). It also states that he was sent to complete good character.",
    evidence: [E.anbiya107],
    citations: [
      ...citationsFor([E.anbiya107]),
      { sourceId: 'quranpedia-quran-hafs', chunkId: 'quran-hafs-68-4', sourceTitle: null, reference: null },
    ],
    verification: {
      status: 'FAIL',
      citationValid: false,
      evidenceSupported: false,
      unsupportedClaims: ['It also states that he was sent to complete good character.'],
      missingCitations: ['quranpedia-quran-hafs:quran-hafs-68-4'],
      riskFlags: [],
      warnings: [],
    },
  }),
  draft({
    id: 'drf_5',
    questionId: 'q_6',
    status: 'blocked',
    aiAction: 'REFER',
    safety: { decision: 'BLOCK', reason: 'Personal ruling (level D): refer to a qualified scholar.' },
    generatedText: null,
    evidence: [],
    verification: null,
  }),
  draft({
    id: 'drf_6',
    questionId: 'q_7',
    status: 'in_review',
    aiAction: 'CLARIFY',
    safety: { decision: 'REVIEW', reason: 'Question is too vague to answer.' },
    generatedText: null,
    evidence: [],
    verification: null,
  }),
  draft({
    id: 'drf_7',
    questionId: 'q_2',
    status: 'approved',
    aiAction: 'ANSWER',
    generatedText:
      "According to the Qur'an, God created humans and jinn to worship Him (51:56).",
    evidence: [E.dhariyat56],
    citations: citationsFor([E.dhariyat56]),
    verification: PASS,
  }),
]

export const ANSWERS = [
  {
    id: 'ans_1',
    daee: { id: 'usr_daee_1', displayName: 'Ustadh Khalid' },
    finalText:
      "The Qur'an states that God created humans and jinn to worship Him (Adh-Dhariyat 51:56). In Islam, worship is broad: it includes prayer and remembrance, but also honesty, kindness to parents, seeking knowledge and helping others when done for God's sake. So the purpose of life is to know God and live every part of life in a way that pleases Him.",
    citations: citationsFor([E.dhariyat56]),
    verificationStatus: 'PASS',
    aiAssisted: true,
    publishedAt: t(4, '08:50'),
    _questionId: 'q_2',
    _draftId: 'drf_7',
  },
  {
    id: 'ans_2',
    daee: { id: 'usr_daee_2', displayName: 'Ustadha Maryam' },
    finalText:
      "Islam teaches that life has a clear purpose: to worship the One God (51:56). Worship here means a relationship with your Creator expressed through prayer, good character and service to people. The Prophet was described as a mercy to all the worlds (21:107), and Muslims try to follow that example of mercy in daily life.",
    citations: citationsFor([E.dhariyat56, E.anbiya107]),
    verificationStatus: 'NEEDS_REVIEW',
    aiAssisted: true,
    publishedAt: t(4, '09:05'),
    _questionId: 'q_2',
    _draftId: null,
  },
]
