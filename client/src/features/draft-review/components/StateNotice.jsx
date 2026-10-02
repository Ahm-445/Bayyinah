const TONE = {
  neutral: 'border-stone-200 bg-white text-stone-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export default function StateNotice({ title, tone = 'neutral', children }) {
  return (
    <section className={`rounded-lg border p-4 ${TONE[tone]}`}>
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  )
}
