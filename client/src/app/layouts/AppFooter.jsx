/** Deep-green closing band with the wordmark. */
export default function AppFooter() {
  return (
    <footer className="border-t border-white/10 bg-house text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-6">
        <span lang="en" className="font-semibold">
          Bayyinah
        </span>
        <span lang="ar" dir="rtl" className="font-quran text-lg leading-none text-white/70">
          بيّنة
        </span>
      </div>
    </footer>
  )
}
