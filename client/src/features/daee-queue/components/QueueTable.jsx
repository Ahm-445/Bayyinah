import { Link, useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import LevelChip from '../../../shared/components/LevelChip.jsx'
import VerificationBadge from '../../../shared/components/VerificationBadge.jsx'
import { AI_ISSUE } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'

const ISSUE_TONE = {
  [AI_ISSUE.INSUFFICIENT]: 'bg-amber-100 text-amber-800',
  [AI_ISSUE.VERIFICATION_FAILED]: 'bg-danger/10 text-danger',
  [AI_ISSUE.CLARIFY]: 'bg-ceramic text-ink-soft',
}

function StatusCell({ item, referred }) {
  const { t } = useI18n()
  if (referred) return <span className="text-danger">{t('queue.referred')}</span>
  if (item.aiIssue) {
    return (
      <span className={`chip ${ISSUE_TONE[item.aiIssue]}`}>
        {t(`aiIssue.${item.aiIssue}`)}
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-ink-soft">{t('queue.ready')}</span>
      {item.verificationStatus && <VerificationBadge status={item.verificationStatus} />}
    </div>
  )
}

export default function QueueTable({ items, now, referred = false }) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[40rem] table-fixed text-start text-sm">
        <thead className="border-b border-black/10 text-xs text-ink-soft">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold">{t('queue.columns.question')}</th>
            <th scope="col" className="w-28 px-4 py-3 text-start font-semibold">{t('queue.columns.level')}</th>
            <th scope="col" className="w-64 px-4 py-3 text-start font-semibold">{t('queue.columns.status')}</th>
            <th scope="col" className="w-36 px-4 py-3 text-start font-semibold">{t('queue.columns.submitted')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/6">
          {items.map((item) => (
            <tr
              key={item.draftId}
              onClick={() => navigate(`/daee/drafts/${item.draftId}`)}
              className="cursor-pointer transition-colors hover:bg-canvas/60"
            >
              <td className="px-4 py-4">
                {/* The link keeps rows keyboard-accessible; the row click is a mouse shortcut.
                    Question text keeps its own direction (dir="auto"). */}
                <Link
                  to={`/daee/drafts/${item.draftId}`}
                  dir="auto"
                  onClick={(e) => e.stopPropagation()}
                  className="line-clamp-2 font-semibold text-ink hover:text-accent hover:underline"
                >
                  {item.questionText}
                </Link>
              </td>
              <td className="px-4 py-3">
                <LevelChip level={item.level} />
              </td>
              <td className="px-4 py-3">
                <StatusCell item={item} referred={referred} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-soft" title={fullDate(item.createdAt, locale)}>
                {timeAgo(item.createdAt, { now, locale })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
