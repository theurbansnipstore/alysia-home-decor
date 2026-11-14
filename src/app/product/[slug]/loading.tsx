export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-64 animate-pulse rounded-sm bg-bone-200" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square animate-pulse rounded-sm bg-bone-200" />
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-bone-200" />
          <div className="h-9 w-3/4 animate-pulse rounded-sm bg-bone-200" />
          <div className="h-6 w-24 animate-pulse rounded-sm bg-bone-200" />
          <div className="h-24 w-full animate-pulse rounded-sm bg-bone-200" />
          <div className="h-11 w-48 animate-pulse rounded-sm bg-bone-200" />
        </div>
      </div>
    </div>
  );
}
