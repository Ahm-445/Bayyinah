import { useParams } from 'react-router'
import PagePlaceholder from '../../../shared/components/PagePlaceholder.jsx'

export default function DraftReviewPage() {
  const { id } = useParams()
  return (
    <PagePlaceholder title="Review draft" story="US-07">
      Draft <code>{id}</code>
    </PagePlaceholder>
  )
}
