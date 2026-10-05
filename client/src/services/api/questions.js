import { mapAnswerList } from '../mappers/answer.js'
import { mapQuestion } from '../mappers/question.js'
import { list } from '../mappers/common.js'
import { request } from '../transport.js'

const id = encodeURIComponent

// All questioner endpoints need a questioner account; a question is visible
// only to the account that asked it (non-owners get 404).

/** @returns {Promise<{ id: string, status: string }>} */
export function submitQuestion({ text, language = 'en' }) {
  return request('POST', '/questions', { body: { text, language } })
}

/**
 * The signed-in questioner's questions, newest first.
 * GET /questions → { questions: Question[] } (pending backend confirmation)
 */
export async function listMyQuestions() {
  const data = await request('GET', '/questions')
  return list(data?.questions).map(mapQuestion)
}

export async function getQuestion(questionId) {
  return mapQuestion(await request('GET', `/questions/${id(questionId)}`))
}

export async function getAnswers(questionId) {
  return mapAnswerList(await request('GET', `/questions/${id(questionId)}/answers`))
}
