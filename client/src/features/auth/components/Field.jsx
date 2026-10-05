/** Labelled text input for the auth forms. */
export default function Field({ id, label, hint, error, ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="text-sm">
      <label htmlFor={id} className="text-stone-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`mt-1 w-full rounded border px-3 py-2 ${error ? 'border-red-400' : 'border-stone-300'}`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-stone-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
