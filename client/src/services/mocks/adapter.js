import { config } from '../config.js'
import { ApiError } from '../errors.js'
import { clearAuth, getAuth, getSessionId } from '../session.js'
import { EVIDENCE, citationsFor } from './fixtures/evidence.js'
import { ANSWERS, DRAFTS, QUESTIONS } from './fixtures/scenarios.js'
import { SOURCES } from './fixtures/sources.js'
import { USERS } from './fixtures/users.js'

// Mock of the REST API in docs/api.md, part 2.
// State is persisted to localStorage so it survives reloads and is shared
// between tabs (questioner tab + dāʿī tab). resetMockData() restores the seed.
// Error codes used here are only the ones api.md defines
// (already_selected, blocked, warnings_not_acknowledged); other errors have no code.

const STORAGE_KEY = 'bayyinah.mockDb.v1'

function seed() {
  return {
    questions: structuredClone(QUESTIONS),
    drafts: structuredClone(DRAFTS),
    answers: structuredClone(ANSWERS),
    users: structuredClone(USERS),
    selections: {}, // `${sessionId}:${questionId}` → answerId
    nextId: 100,
  }
}

// Falls back to in-memory state when storage is unavailable.
function load(current) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore: storage blocked or corrupt
  }
  return current ?? seed()
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignore: storage blocked or full
  }
}

let db = load()

export function resetMockData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  db = seed()
}

const newId = (prefix) => `${prefix}_${db.nextId++}`
const now = () => new Date().toISOString()

const fail = (status, message, code) => {
  throw new ApiError(status, message, code ?? null)
}

/** Drops mock-internal "_" fields. */
function publicView(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('_')))
}

// ---------------------------------------------------------------------------
// Simulated AI pipeline for newly submitted questions.
// Status is derived from elapsed time on each read, so polling sees
// submitted → drafting → awaiting_review (or referred).

const DRAFTING_AFTER_MS = 1500
const DONE_AFTER_MS = 5000
// Crude stand-in for the backend classifier: personal questions → level D.
const PERSONAL = /\b(my|should i|can i|am i|fatwa)\b/i

function advanceQuestion(q) {
  if (!q._submittedAtMs || q._processed) return
  const elapsed = Date.now() - q._submittedAtMs
  if (elapsed < DRAFTING_AFTER_MS) return
  if (elapsed < DONE_AFTER_MS) {
    q.status = 'drafting'
    return
  }

  q._processed = true
  const daees = db.users.filter((u) => u.role === 'daee')
  const personal = PERSONAL.test(q.text)

  if (personal) {
    q.status = 'referred'
    q.classification = { category: 'fiqh', level: 'D', risk: 'high', action: 'REFER', reasons: [] }
  } else {
    q.status = 'awaiting_review'
    q.classification = { category: 'general_islam', level: 'A', risk: 'low', action: 'ANSWER', reasons: [] }
  }

  const evidence = personal ? [] : [EVIDENCE.dhariyat56]
  const generatedText = personal
    ? null
    : `[Mock draft] This is a placeholder AI draft for: "${q.text}". The Qur'an states that God created humans and jinn to worship Him (51:56).`

  for (const daee of daees) {
    db.drafts.push({
      id: newId('drf'),
      status: personal ? 'blocked' : 'in_review',
      question: {
        id: q.id,
        text: q.text,
        language: q.language,
        classification: { category: q.classification.category, level: q.classification.level, risk: q.classification.risk },
      },
      aiAction: personal ? 'REFER' : 'ANSWER',
      safety: personal
        ? { decision: 'BLOCK', reason: 'Personal ruling (level D): refer to a qualified scholar.' }
        : { decision: 'ALLOW', reason: 'Question is within approved scope.' },
      generatedText,
      text: generatedText,
      versions: generatedText ? [{ text: generatedText, editedAt: now() }] : [],
      evidence,
      citations: citationsFor(evidence),
      verification: personal
        ? null
        : {
            status: 'PASS',
            citationValid: true,
            evidenceSupported: true,
            unsupportedClaims: [],
            missingCitations: [],
            riskFlags: [],
            warnings: [],
          },
      requiresAcknowledgement: false,
      _daeeId: daee.id,
      _createdAt: now(),
    })
  }
}

// ---------------------------------------------------------------------------
// Lookups and guards

function findQuestion(id, sessionId) {
  const q = db.questions.find((item) => item.id === id)
  // The real backend only serves a question to its owner session.
  if (!q || (q._sessionId && q._sessionId !== sessionId)) fail(404, 'Question not found.')
  advanceQuestion(q)
  return q
}

function requireUser(ctx, roles = ['daee', 'admin']) {
  if (!ctx.user) fail(401, 'Please sign in.')
  if (!roles.includes(ctx.user.role)) fail(403, 'You do not have access to this page.')
  return ctx.user
}

function findOwnDraft(ctx, id) {
  const user = requireUser(ctx)
  const draft = db.drafts.find((d) => d.id === id)
  if (!draft || (user.role !== 'admin' && draft._daeeId !== user.id)) fail(404, 'Draft not found.')
  return draft
}

const isClosed = (draft) => draft.status === 'approved' || draft.status === 'rejected'

const publicUser = (u) => ({ id: u.id, displayName: u.displayName, role: u.role })

// ---------------------------------------------------------------------------
// Routes (paths relative to /api)

const routes = [
  ['GET', '/health', () => ({ status: 'ok', db: 'connected', uptime: 1 })],

  // Auth
  ['POST', '/auth/login', ({ body }) => {
    const user = db.users.find((u) => u.email === body?.email?.trim().toLowerCase())
    if (!user || user.password !== body?.password) fail(401, 'Invalid email or password.')
    return { token: `mock-token:${user.id}`, user: publicUser(user) }
  }],
  ['GET', '/auth/me', (ctx) => publicUser(requireUser(ctx, ['questioner', 'daee', 'admin']))],

  // Questioner
  ['POST', '/questions', ({ body, sessionId }) => {
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (text.length < 1 || text.length > 2000) {
      fail(400, 'Question must be between 1 and 2000 characters.')
    }
    const q = {
      id: newId('q'),
      text,
      language: body.language || 'en',
      status: 'submitted',
      classification: null,
      createdAt: now(),
      _sessionId: sessionId,
      _submittedAtMs: Date.now(),
    }
    db.questions.push(q)
    return [201, { id: q.id, status: q.status }]
  }],
  ['GET', '/questions/:id', ({ params, sessionId }) => {
    const q = findQuestion(params.id, sessionId)
    return {
      id: q.id,
      text: q.text,
      language: q.language,
      status: q.status,
      classification: q.classification
        ? { category: q.classification.category, level: q.classification.level }
        : null,
      createdAt: q.createdAt,
    }
  }],
  ['GET', '/questions/:id/answers', ({ params, sessionId }) => {
    const q = findQuestion(params.id, sessionId)
    return {
      selectedAnswerId: db.selections[`${sessionId}:${q.id}`] ?? null,
      answers: db.answers.filter((a) => a._questionId === q.id).map(publicView),
    }
  }],
  ['POST', '/answers/:id/select', ({ params, sessionId }) => {
    const answer = db.answers.find((a) => a.id === params.id)
    if (!answer) fail(404, 'Answer not found.')
    const key = `${sessionId}:${answer._questionId}`
    if (db.selections[key]) fail(409, 'You already selected an answer for this question.', 'already_selected')
    db.selections[key] = answer.id
    return [201, { selected: true }]
  }],

  // Dāʿī
  ['GET', '/daee/dashboard', (ctx) => {
    const user = requireUser(ctx)
    const mine = db.drafts.filter((d) => user.role === 'admin' || d._daeeId === user.id)
    const count = (fn) => mine.filter(fn).length
    return {
      stats: {
        pending: count((d) => d.status === 'in_review'),
        approved: count((d) => d.status === 'approved'),
        rejected: count((d) => d.status === 'rejected'),
        referred: count((d) => d.aiAction === 'REFER'),
        score: db.users.find((u) => u.id === user.id)?.score ?? 0,
      },
      queue: mine
        .filter((d) => !isClosed(d))
        .sort((a, b) => b._createdAt.localeCompare(a._createdAt))
        .map((d) => ({
          draftId: d.id,
          questionId: d.question.id,
          questionText: d.question.text,
          level: d.question.classification.level,
          verificationStatus: d.verification?.status ?? null,
          status: d.status,
          createdAt: d._createdAt,
        })),
    }
  }],
  ['GET', '/drafts/:id', (ctx) => publicView(findOwnDraft(ctx, ctx.params.id))],
  ['PATCH', '/drafts/:id', (ctx) => {
    const draft = findOwnDraft(ctx, ctx.params.id)
    if (isClosed(draft)) fail(409, `This draft was already ${draft.status}.`)
    const text = ctx.body?.text
    if (typeof text !== 'string' || !text.trim()) fail(400, 'Draft text cannot be empty.')
    draft.text = text
    draft.versions.push({ text, editedAt: now() })
    return publicView(draft)
  }],
  ['POST', '/drafts/:id/approve', (ctx) => {
    const draft = findOwnDraft(ctx, ctx.params.id)
    if (isClosed(draft)) fail(409, `This draft was already ${draft.status}.`)
    if (draft.status === 'blocked') fail(422, 'This draft is blocked and cannot be approved.', 'blocked')
    if (draft.requiresAcknowledgement && ctx.body?.acknowledgeWarnings !== true) {
      fail(422, 'Please acknowledge the verification warnings before approving.', 'warnings_not_acknowledged')
    }
    const user = db.users.find((u) => u.id === draft._daeeId) ?? ctx.user
    const answer = {
      id: newId('ans'),
      daee: { id: user.id, displayName: user.displayName },
      finalText: draft.text,
      citations: draft.citations,
      verificationStatus: draft.verification?.status ?? 'NEEDS_REVIEW',
      aiAssisted: true,
      publishedAt: now(),
      _questionId: draft.question.id,
      _draftId: draft.id,
    }
    db.answers.push(answer)
    draft.status = 'approved'
    const q = db.questions.find((item) => item.id === draft.question.id)
    if (q) q.status = 'answered'
    return { answerId: answer.id }
  }],
  ['POST', '/drafts/:id/reject', (ctx) => {
    const draft = findOwnDraft(ctx, ctx.params.id)
    if (isClosed(draft)) fail(409, `This draft was already ${draft.status}.`)
    if (typeof ctx.body?.reason !== 'string' || !ctx.body.reason.trim()) {
      fail(400, 'Please give a reason for rejecting.')
    }
    draft.status = 'rejected'
    draft._rejectReason = ctx.body.reason
    return { status: 'rejected' }
  }],

  // Sources
  ['GET', '/sources/:sourceId', (ctx) => {
    const source = SOURCES.find((s) => s.sourceId === ctx.params.sourceId)
    if (!source) fail(404, 'Source not found.')
    return source
  }],
].map(([method, pattern, handler]) => ({
  method,
  handler,
  regex: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
}))

// ---------------------------------------------------------------------------

function currentUser() {
  const token = getAuth()?.token
  const userId = token?.startsWith('mock-token:') ? token.slice('mock-token:'.length) : null
  return db.users.find((u) => u.id === userId) ?? null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function mockRequest(method, path, { body } = {}) {
  await sleep(config.mockLatencyMs)
  db = load(db) // pick up changes made in another tab
  const cleanPath = path.split('?')[0]

  let status = 200
  try {
    for (const route of routes) {
      if (route.method !== method) continue
      const match = route.regex.exec(cleanPath)
      if (!match) continue

      const params = Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)]),
      )
      const ctx = {
        params,
        body: body === undefined ? undefined : structuredClone(body),
        sessionId: getSessionId(),
        user: currentUser(),
      }
      let result = route.handler(ctx)
      if (Array.isArray(result)) [status, result] = result
      save() // GETs can change state too (simulated pipeline progress)
      console.debug(`[mock] ${method} ${path} → ${status}`)
      // Clone so the UI can never mutate mock state by reference.
      return structuredClone(result)
    }
    fail(404, 'Not found.')
  } catch (error) {
    if (error instanceof ApiError) {
      // Same as http.js: a 401 means the stored token is no longer valid.
      if (error.status === 401) clearAuth()
      console.debug(`[mock] ${method} ${path} → ${error.status}${error.code ? ` (${error.code})` : ''}`)
    }
    throw error
  }
}
