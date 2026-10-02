import { useMutation } from '@tanstack/react-query'
import { submitQuestion } from '../../../services/api/questions.js'

export function useSubmitQuestion() {
  return useMutation({ mutationFn: submitQuestion })
}
