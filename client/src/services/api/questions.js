import { mapAnswerList } from '../mappers/answer.js'
import { mapQuestion } from '../mappers/question.js'
import { request } from '../transport.js'

const id = encodeURIComponent

/** @returns {Promise<{ id: string, status: string }>} */
export function submitQuestion({ text, language = 'en' }) {
  return request('POST', '/questions', { body: { text, language } })
}

export async function getQuestion(questionId) {
  return mapQuestion(await request('GET', `/questions/${id(questionId)}`))
}

export async function getAnswers(questionId) {
  return mapAnswerList(await request('GET', `/questions/${id(questionId)}/answers`))
}
