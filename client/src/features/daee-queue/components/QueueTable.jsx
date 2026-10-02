import { Link, useNavigate } from 'react-router'
import LevelChip from '../../../shared/components/LevelChip.jsx'
import VerificationBadge from '../../../shared/components/VerificationBadge.jsx'
import { DRAFT_STATUS } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { PARKED_REASON } from '../lib/queueSections.js'

function StatusCell({ item }) {
  if (item.parkedReason === PARKED_REASON.REFERRAL) {
    return <span className="text-red-700">Referred</span>
  }
  if (item.parkedReason === PARKED_REASON.CLARIFY) {
    return <span className="text-stone-600">Needs clarification</span>
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.status === DRAFT_STATUS.BLOCKED ? (
        <span className="text-red-700">Blocked</span>
      ) : (
        <span className="text-stone-700">Ready for review</span>
      )}
      {item.verificationStatus && <VerificationBadge status={item.verificationStatus} />}
    </div>
  )
}

export default function QueueTable({ items, now }) {
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
                <StatusCell item={item} />
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
