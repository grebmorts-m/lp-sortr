export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 border-red-900 bg-red-950/50 text-red-300">
      {message}
    </div>
  )
}
