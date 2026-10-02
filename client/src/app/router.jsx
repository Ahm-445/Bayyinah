import { createBrowserRouter, Navigate } from 'react-router'
import AdminEvalPage from '../features/admin-eval/pages/AdminEvalPage.jsx'
import AskPage from '../features/ask/pages/AskPage.jsx'
import LoginPage from '../features/auth/pages/LoginPage.jsx'
import QueuePage from '../features/daee-queue/pages/QueuePage.jsx'
import DraftReviewPage from '../features/draft-review/pages/DraftReviewPage.jsx'
import QuestionPage from '../features/question/pages/QuestionPage.jsx'
import { ROLE } from '../shared/lib/enums.js'
import DaeeLayout from './layouts/DaeeLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import RequireRole from './RequireRole.jsx'
import RouteError from './RouteError.jsx'

const STAFF = [ROLE.DAEE, ROLE.ADMIN]

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/ask" replace /> },
      { path: 'ask', element: <AskPage /> },
      { path: 'questions/:id', element: <QuestionPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: (
      <RequireRole roles={STAFF}>
        <DaeeLayout />
      </RequireRole>
    ),
    errorElement: <RouteError />,
    children: [
      { path: 'daee', element: <QueuePage /> },
      { path: 'daee/drafts/:id', element: <DraftReviewPage /> },
    ],
  },
  {
    element: (
      <RequireRole roles={[ROLE.ADMIN]}>
        <DaeeLayout />
      </RequireRole>
    ),
    errorElement: <RouteError />,
    children: [{ path: 'admin/eval', element: <AdminEvalPage /> }],
  },
])
