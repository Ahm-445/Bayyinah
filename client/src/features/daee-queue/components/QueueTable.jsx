import { Link, useNavigate } from 'react-router'
import LevelChip from '../../../shared/components/LevelChip.jsx'
import VerificationBadge from '../../../shared/components/VerificationBadge.jsx'
import { AI_ISSUE, AI_ISSUE_LABEL } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'

const ISSUE_TONE = {
  [AI_ISSUE.INSUFFICIENT]: 'bg-amber-100 text-amber-800',
  [AI_ISSUE.VERIFICATION_FAILED]: 'bg-red-100 text-red-800',
  [AI_ISSUE.CLARIFY]: 'bg-stone-100 text-stone-700',
}

function StatusCell({ item, referred }) {
  if (referred) return <span className="text-red-700">Referred</span>
  if (item.aiIssue) {
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${ISSUE_TONE[item.aiIssue]}`}>
        {AI_ISSUE_LABEL[item.aiIssue]}
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-stone-700">Ready for review</span>
      {item.verificationStatus && <VerificationBadge status={item.verificationStatus} />}
    </div>
  )
}

export default function QueueTable({ items, now, referred = false }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full min-w-[40rem] table-fixed text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Question</th>
            <th scope="col" className="w-24 px-4 py-2 font-medium">Level</th>
            <th scope="col" className="w-64 px-4 py-2 font-medium">Status</th>
            <th scope="col" className="w-36 px-4 py-2 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item) => (
            <tr
              key={item.draftId}
              onClick={() => navigate(`/daee/drafts/${item.draftId}`)}
              className="cursor-pointer hover:bg-stone-50"
            >
              <td className="px-4 py-3">
                {/* The link keeps rows keyboard-accessible; the row click is a mouse shortcut. */}
                <Link
                  to={`/daee/drafts/${item.draftId}`}
                  dir="auto"
                  onClick={(e) => e.stopPropagation()}
                  className="line-clamp-2 font-medium text-stone-900 hover:underline"
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
              <td className="px-4 py-3 whitespace-nowrap text-stone-600" title={fullDate(item.createdAt)}>
                {timeAgo(item.createdAt, now)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
