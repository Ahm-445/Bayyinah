import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { selectAnswer } from '../../../services/api/answers.js'
import { getAnswers, getQuestion } from '../../../services/api/questions.js'
import { QUESTION_STATUS } from '../../../shared/lib/enums.js'

const questionKey = (id) => ['questions', id]
const answersKey = (id) => ['questions', id, 'answers']

// docs/api.md: poll every 2–3 s while the AI runs. Slower while a dāʿī reviews.
function questionPollInterval(query) {
  const question = query.state.data
  if (!question || query.state.status === 'error') return false
  if (question.isProcessing) return 2_500
  if (question.status === QUESTION_STATUS.AWAITING_REVIEW) return 15_000
  return false
}

export function useQuestion(id) {
  return useQuery({
    queryKey: questionKey(id),
    queryFn: () => getQuestion(id),
    refetchInterval: questionPollInterval,
  })
}

export function useAnswers(id, { enabled }) {
  return useQuery({
    queryKey: answersKey(id),
    queryFn: () => getAnswers(id),
    enabled,
    // More dāʿīs may still publish answers; stop once the questioner has chosen.
    refetchInterval: (query) => (query.state.data?.selectedAnswerId ? false : 30_000),
  })
}

export function useSelectAnswer(questionId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: selectAnswer,
    // Refetch on error too: 409 already_selected means our copy is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: answersKey(questionId) }),
  })
}
