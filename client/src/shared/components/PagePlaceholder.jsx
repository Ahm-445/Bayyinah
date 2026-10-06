/** Temporary stand-in for screens not built yet. `note` is already translated. */
export default function PagePlaceholder({ title, note, children }) {
  return (
    <section className="rounded-card border border-dashed border-black/20 bg-white/60 p-8">
      <h1 className="text-2xl font-semibold text-brand">{title}</h1>
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
      {children && <div className="mt-4 text-ink-soft">{children}</div>}
    </section>
  )
}
