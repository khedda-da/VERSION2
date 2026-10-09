import { EmptyState } from "./EmptyState"

/** Pulsing placeholder rows (re-uses the existing `.skeleton-list` styles). */
export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="جارٍ التحميل">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <i />
          <span>
            <b />
            <small />
          </span>
        </div>
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon="error"
      title="تعذر تحميل البيانات."
      detail={message}
      action={onRetry ? "إعادة المحاولة" : undefined}
      onAction={onRetry}
    />
  )
}
