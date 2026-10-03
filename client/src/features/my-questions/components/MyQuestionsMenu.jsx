import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useMyQuestions } from '../hooks/useMyQuestions.js'

/** Header dropdown listing this session's questions. Hidden when empty. */
export default function MyQuestionsMenu() {
  const questions = useMyQuestions()
  const ref = useRef(null)
  const close = () => {
    if (ref.current) ref.current.open = false
  }

  // Close on outside click (picking a link closes it via onClick).
  useEffect(() => {
    function onPointerDown(event) {
      if (ref.current?.open && !ref.current.contains(event.target)) ref.current.open = false
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  if (!questions.length) return null

  return (
    <details ref={ref} className="relative">
      <summary className="cursor-pointer list-none text-stone-700 hover:text-stone-950 [&::-webkit-details-marker]:hidden">
        My questions <span className="text-stone-500">({questions.length})</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
        <ul className="max-h-80 overflow-y-auto">
          {questions.map((q) => (
            <li key={q.id}>
              <Link
                to={`/questions/${q.id}`}
                onClick={close}
                dir="auto"
                className="line-clamp-2 rounded px-2 py-1.5 text-sm text-stone-800 hover:bg-stone-100"
              >
                {q.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
