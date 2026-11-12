/** Password field with an eye button to switch between dots and plain text. */
export default function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete,
  invalid = false,
  describedBy,
}: {
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  placeholder: string
  autoComplete: string
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="relative">
      <input
        className={`input pr-10 ${invalid ? 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20' : ''}`}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        required
      />
      <button
        type="button"
        onClick={onToggle}
        // Keep focus (and the caret) in the input.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-2 grid w-7 place-items-center text-muted transition hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}
