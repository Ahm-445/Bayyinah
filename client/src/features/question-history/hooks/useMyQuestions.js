import { useQuery } from '@tanstack/react-query'
import { listMyQuestions } from '../../../services/api/questions.js'

export const MY_QUESTIONS_KEY = ['questions', 'mine']

/** The signed-in questioner's questions, newest first. */
export function useMyQuestions() {
  return useQuery({
    queryKey: MY_QUESTIONS_KEY,
    queryFn: listMyQuestions,
    // Faster while a question is still being prepared, so its status updates.
    refetchInterval: (query) => (query.state.data?.some((q) => q.isProcessing) ? 3_000 : 30_000),
  })
}
