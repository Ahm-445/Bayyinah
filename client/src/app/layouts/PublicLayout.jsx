import { Link, Outlet } from 'react-router'
import MyQuestionsMenu from '../../features/my-questions/components/MyQuestionsMenu.jsx'
import AppHeader from './AppHeader.jsx'

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/ask">
        <Link to="/ask" className="text-stone-700 hover:text-stone-950">
          Ask a question
        </Link>
        <MyQuestionsMenu />
        <Link to="/login" className="text-stone-500 hover:text-stone-950">
          Dāʿī sign in
        </Link>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
