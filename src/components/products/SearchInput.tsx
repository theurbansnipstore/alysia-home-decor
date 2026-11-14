interface SearchInputProps {
  basePath: string;
  defaultValue?: string;
}

export default function SearchInput({ basePath, defaultValue }: SearchInputProps) {
  return (
    <form action={basePath} method="get" role="search" className="w-full max-w-sm">
      <label htmlFor="catalog-search" className="sr-only">
        Search products
      </label>
      <input
        id="catalog-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products…"
        className="w-full border border-ink-100 bg-bone-100 px-4 py-2.5 text-sm focus:border-brass focus:outline-none"
      />
    </form>
  );
}
