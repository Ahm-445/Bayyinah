/** Temporary stand-in for screens not built yet. */
export default function PagePlaceholder({ title, story, children }) {
  return (
    <section className="rounded-lg border border-dashed border-stone-300 bg-white p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {story && <p className="mt-1 text-sm text-stone-500">{story} · coming next</p>}
      {children && <div className="mt-4 text-stone-700">{children}</div>}
    </section>
  )
}
