/** Grouped button selector (radio group). */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: [T, string][]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg bg-surface p-1 ring-1 ring-line ${className}`}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition ${
            value === v
              ? 'bg-surface-2 text-fg shadow-sm'
              : 'text-muted hover:text-fg'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
