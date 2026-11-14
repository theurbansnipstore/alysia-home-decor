export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-7 w-40 bg-ink-100" />
      <div className="mb-6 h-16 bg-ink-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 border border-ink-100 bg-bone-200" />
        ))}
      </div>
      <div className="mt-8 h-56 bg-ink-100" />
    </div>
  );
}
