import { useParams } from 'react-router'
import PagePlaceholder from '../../../shared/components/PagePlaceholder.jsx'

export default function QuestionPage() {
  const { id } = useParams()
  return (
    <PagePlaceholder title="Your question" story="US-09">
      Question <code>{id}</code>: status polling, then compare approved answers.
    </PagePlaceholder>
  )
}
