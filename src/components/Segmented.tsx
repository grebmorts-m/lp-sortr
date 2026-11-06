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
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg bg-zinc-200/70 p-1 dark:bg-zinc-800 ${className}`}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition ${
            value === v
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
