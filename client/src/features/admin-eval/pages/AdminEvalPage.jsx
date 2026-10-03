import { useI18n } from '../../../i18n/core.js'
import PagePlaceholder from '../../../shared/components/PagePlaceholder.jsx'

export default function AdminEvalPage() {
  const { t } = useI18n()
  return <PagePlaceholder title={t('adminEval.title')} note={t('adminEval.note')} />
}
