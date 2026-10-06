/** Labelled text input for the auth forms. */
export default function Field({ id, label, hint, error, ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="input mt-1"
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
