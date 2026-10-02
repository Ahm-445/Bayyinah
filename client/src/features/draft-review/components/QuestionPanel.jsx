import LevelChip from '../../../shared/components/LevelChip.jsx'
import PipelineTimeline from '../../../shared/components/PipelineTimeline.jsx'
import { pipelineSteps } from '../lib/pipelineSteps.js'

const label = (value) => value?.replaceAll('_', ' ')

export default function QuestionPanel({ draft }) {
  const { question, safety } = draft
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
        <LevelChip level={question.level} showLabel />
        {question.category && (
          <span className="rounded bg-stone-100 px-2 py-0.5 capitalize">{label(question.category)}</span>
        )}
        {question.risk && <span className="rounded bg-stone-100 px-2 py-0.5">Risk: {question.risk}</span>}
      </div>
      <h1 dir="auto" lang={question.language} className="mt-3 text-xl font-semibold text-stone-900">
        {question.text}
      </h1>
      {safety?.reason && (
        <p className="mt-2 text-sm text-stone-600">
          <span className="font-medium">Safety ({safety.decision?.toLowerCase()}):</span> {safety.reason}
        </p>
      )}
      <div className="mt-4 border-t border-stone-100 pt-3">
        <PipelineTimeline steps={pipelineSteps(draft)} />
      </div>
    </section>
  )
}
