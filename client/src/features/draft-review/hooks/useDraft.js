import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveDraft, getDraft, rejectDraft, updateDraft } from '../../../services/api/drafts.js'

export const draftKey = (id) => ['drafts', id]
const DASHBOARD_KEY = ['daee', 'dashboard']

export function useDraft(id) {
  return useQuery({ queryKey: draftKey(id), queryFn: () => getDraft(id) })
}

function useDraftMutation(id, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      // Refetch even on error: a 409/422 usually means our copy is stale.
      queryClient.invalidateQueries({ queryKey: draftKey(id) })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}

export function useSaveDraft(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text) => updateDraft(id, text),
    onSuccess: (draft) => queryClient.setQueryData(draftKey(id), draft),
  })
}

/** One call: the final editor text is sent with the approval (docs/api.md). */
export function useApproveDraft(id) {
  return useDraftMutation(id, ({ text, acknowledgeWarnings }) => approveDraft(id, { text, acknowledgeWarnings }))
}

export function useRejectDraft(id) {
  return useDraftMutation(id, (reason) => rejectDraft(id, reason))
}
