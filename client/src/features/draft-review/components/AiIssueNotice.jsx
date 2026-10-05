import { useI18n } from '../../../i18n/core.js'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { AI_ISSUE } from '../../../shared/lib/enums.js'

function Problems({ title, items }) {
  if (!items.length) return null
  return (
    <div className="mt-2">
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 ps-5">
        {items.map((item) => (
          <li key={item} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Advisory banner above the editor when the AI could not give a usable draft.
 * Wording: "Verification failed" = a draft exists and failed verification;
 * "Insufficient evidence" = too little evidence, no draft.
 */
export default function AiIssueNotice({ draft }) {
  const { t } = useI18n()
  const { aiIssue, verification } = draft
  if (!aiIssue) return null

  if (aiIssue === AI_ISSUE.VERIFICATION_FAILED) {
    return (
      <StateNotice title={t('review.issue.failedTitle')} tone="danger">
        <p>{t('review.issue.failedBody')}</p>
        <Problems title={t('review.issue.unsupported')} items={verification.unsupportedClaims} />
        <Problems title={t('review.issue.missing')} items={verification.missingCitations} />
        <Problems title={t('review.issue.riskFlags')} items={verification.riskFlags} />
        <Problems title={t('review.issue.warnings')} items={verification.warnings} />
      </StateNotice>
    )
  }

  if (aiIssue === AI_ISSUE.CLARIFY) {
    return (
      <StateNotice title={t('review.issue.clarifyTitle')} tone="warning">
        {t('review.issue.clarifyBody')}
      </StateNotice>
    )
  }

  return (
    <StateNotice title={t('review.issue.insufficientTitle')} tone="warning">
      {t('review.issue.insufficientBody')}{' '}
      {draft.evidence.length > 0 ? t('review.issue.evidenceFound') : t('review.issue.noEvidence')}
    </StateNotice>
  )
}
