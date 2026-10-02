import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../../../services/api/daee.js'

export function useDashboard() {
  return useQuery({
    queryKey: ['daee', 'dashboard'],
    queryFn: getDashboard,
    // New questions arrive in the background; keep the queue fresh.
    refetchInterval: 15_000,
  })
}
