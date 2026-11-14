## Module 7 Addendum — Catalog Architecture (append to PROJECT_DECISIONS.md)

### Module Completion Log
| Module | Status | Notes |
|---|---|---|
| 7 — Search, Filters & Catalog Architecture | ✅ Complete | Unified catalog engine across `/shop`, `/categories/[slug]`, `/themes/[slug]`; URL-driven server-side filtering |

### Catalog Architecture Decisions

- **One catalog engine, not three.** `getProductCatalog()` (`src/lib/data/catalog.ts`) is the single product-listing query used by `/shop` and both collection detail pages. Category/theme detail pages pre-apply and lock their slug as one filter among several rather than maintaining separate query logic — the Module 5 functions `getCategoryWithProducts`/`getThemeWithProducts` were removed (superseded), replaced by lighter `getCategoryBySlug`/`getThemeBySlug` metadata-only lookups.
- **Search is provider-abstracted.** `src/lib/search/provider.ts` defines a `SearchProvider` interface; `PrismaSearchProvider` is the only implementation today. Moving to Meilisearch/Algolia/Elasticsearch/OpenSearch later means writing a new class and changing one factory function (`getSearchProvider()`) — the catalog engine and every UI component are unaffected.
- **All catalog configuration is centralized** in `src/lib/config/catalog.ts`: sort options, price buckets, badge/filter definitions (which double as ProductCard ribbon labels — defined once, not duplicated between filter UI and product card), filter section order, default page size, default layout. This is the file a future Admin Dashboard module replaces the data source of — no component changes needed when that happens.
- **Filters are URL state, not client state.** Every filter (category, theme, badges, price bucket, availability, search, sort, page) is a URL search param; filter "checkboxes" are real `<a>` links, not client-managed form state. This makes every filtered view shareable/bookmarkable and keeps filtering genuinely server-side, per the explicit requirement.
- **Cross-filtering:** category detail pages let you further filter by theme (and vice versa) — the catalog engine already supported both `categorySlug` and `themeSlug` simultaneously, so this was a small additive win rather than new architecture.
- **Future collection types** (seasonal, manual, sale, custom) are meant to become a new key on `CatalogFilters`, not a new query implementation — the engine's shape was deliberately designed for this.
- **Removed as dead code:** `getAllProducts`/`ProductSort`/`GetAllProductsOptions` in `src/lib/data/products.ts` (fully superseded by the catalog engine), and the unused `ProductImageRole` type from Module 6.
