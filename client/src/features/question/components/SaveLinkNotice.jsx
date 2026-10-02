import { useState } from 'react'

/**
 * Questions are tied to this browser's session id, so the link only works
 * here. Remind the questioner to keep it.
 */
export default function SaveLinkNotice({ justSubmitted }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.href

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      className={`rounded-lg border p-4 ${
        justSubmitted ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'
      }`}
    >
      {justSubmitted && <h2 className="font-semibold text-emerald-900">Your question was sent</h2>}
      <p className="text-sm text-stone-700">
        <span className="font-medium">Save this link</span> to come back for your answers. It only
        works in this browser on this device.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded bg-stone-100 px-2 py-1 text-xs text-stone-700">{url}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-stone-50"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </section>
  )
}
