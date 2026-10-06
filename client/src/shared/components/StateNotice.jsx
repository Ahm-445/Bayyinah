const TONE = {
  neutral: 'bg-white text-ink shadow-card',
  warning: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
  danger: 'bg-danger/5 text-danger ring-1 ring-danger/20',
  success: 'bg-mint/60 text-house',
}

export default function StateNotice({ title, tone = 'neutral', children }) {
  return (
    <section className={`rounded-card p-5 ${TONE[tone]}`}>
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 text-sm">{children}</div>
    </section>
  )
}
