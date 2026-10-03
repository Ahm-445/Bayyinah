import { useSyncExternalStore } from 'react'
import { getMyQuestions, subscribeMyQuestions } from '../../../services/session.js'

/** Questions asked from this browser session, newest first. */
export function useMyQuestions() {
  return useSyncExternalStore(subscribeMyQuestions, getMyQuestions)
}
