import { createBrowserRouter } from 'react-router'
import I18nProvider from '../i18n/I18nProvider.jsx'
import AdminEvalPage from '../features/admin-eval/pages/AdminEvalPage.jsx'
import AskPage from '../features/ask/pages/AskPage.jsx'
import LoginPage from '../features/auth/pages/LoginPage.jsx'
import RegisterPage from '../features/auth/pages/RegisterPage.jsx'
import QueuePage from '../features/daee-queue/pages/QueuePage.jsx'
import DraftReviewPage from '../features/draft-review/pages/DraftReviewPage.jsx'
import QuestionPage from '../features/question/pages/QuestionPage.jsx'
import { ROLE } from '../shared/lib/enums.js'
import HomeRedirect from './HomeRedirect.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'
import DaeeLayout from './layouts/DaeeLayout.jsx'
import QuestionerLayout from './layouts/QuestionerLayout.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import RequireRole from './RequireRole.jsx'
import RouteError from './RouteError.jsx'

const STAFF = [ROLE.DAEE, ROLE.ADMIN]

export const router = createBrowserRouter([
  {
    // Root: UI language (en/ar) and <html lang/dir> for every page.
    element: <I18nProvider />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // Questioner dashboard: ask box or an open question, plus the history sidebar.
        element: (
          <RequireRole roles={[ROLE.QUESTIONER]}>
            <QuestionerLayout />
          </RequireRole>
        ),
        errorElement: <RouteError />,
        children: [
          { path: 'ask', element: <AskPage /> },
          { path: 'questions/:id', element: <QuestionPage /> },
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
    ],
  },
])
