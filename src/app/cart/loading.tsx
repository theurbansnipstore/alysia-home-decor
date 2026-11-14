export default function CartLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-9 w-40 animate-pulse rounded-sm bg-bone-200" />
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-ink-100 py-6">
              <div className="h-24 w-24 animate-pulse rounded-sm bg-bone-200" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded-sm bg-bone-200" />
                <div className="h-4 w-1/4 animate-pulse rounded-sm bg-bone-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-sm bg-bone-200 lg:w-96 lg:shrink-0" />
      </div>
    </div>
  );
}
