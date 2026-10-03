import StateNotice from '../../../shared/components/StateNotice.jsx'
import { AI_ISSUE, AI_ISSUE_LABEL } from '../../../shared/lib/enums.js'

function Problems({ title, items }) {
  if (!items.length) return null
  return (
    <div className="mt-2">
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item) => (
          <li key={item} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Advisory banner above the editor when the AI could not give a usable draft. */
export default function AiIssueNotice({ draft }) {
  const { aiIssue, verification } = draft
  if (!aiIssue) return null
  const title = AI_ISSUE_LABEL[aiIssue]

  if (aiIssue === AI_ISSUE.VERIFICATION_FAILED) {
    return (
      <StateNotice title={`${title}: check the draft before publishing`} tone="danger">
        <p>
          The AI draft below did not pass verification. You can edit and publish it, but fix or
          remove these problems first.
        </p>
        <Problems title="Claims the evidence does not support" items={verification.unsupportedClaims} />
        <Problems title="Citations not in the retrieved evidence" items={verification.missingCitations} />
        <Problems title="Risk flags" items={verification.riskFlags} />
        <Problems title="Warnings" items={verification.warnings} />
      </StateNotice>
    )
  }

  if (aiIssue === AI_ISSUE.CLARIFY) {
    return (
      <StateNotice title={`${title}: no AI draft`} tone="warning">
        The AI judged this question too unclear to answer, so it did not draft one. You can write an
        answer yourself, or reject the question.
      </StateNotice>
    )
  }

  return (
    <StateNotice title={`${title}: write the answer yourself`} tone="warning">
      The approved sources did not contain enough evidence for the AI to draft an answer.
      {draft.evidence.length > 0
        ? ' The evidence it did find is listed on the right.'
        : ' No evidence was found.'}
    </StateNotice>
  )
}
