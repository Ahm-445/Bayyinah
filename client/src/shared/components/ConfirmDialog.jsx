import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/core.js'

/** Modal confirm built on <dialog> (focus trap, Esc to cancel). */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null)
  const { t } = useI18n()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card bg-white p-0 text-ink shadow-float backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-xl font-semibold text-brand">
          {title}
        </h2>
        <div className="mt-2 text-sm text-ink-soft">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-ghost"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
