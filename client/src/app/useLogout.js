import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { logout } from '../services/api/auth.js'

/** Signs out, drops every cached query (another account may sign in next) and goes to /login. */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return () => {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}
