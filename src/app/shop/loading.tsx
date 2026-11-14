export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-48 animate-pulse rounded-sm bg-bone-200" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] animate-pulse rounded-sm bg-bone-200" />
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-bone-200" />
            <div className="h-4 w-1/3 animate-pulse rounded-sm bg-bone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
