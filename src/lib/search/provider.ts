import "server-only";
import { prisma } from "@/lib/prisma";

export interface SearchProvider {
  /** Returns matching product IDs for a query. Empty array = no matches (not "search unavailable"). */
  search(query: string): Promise<string[]>;
}

class PrismaSearchProvider implements SearchProvider {
  async search(query: string): Promise<string[]> {
    const results = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query } },
          { sku: { contains: query } },
        ],
      },
      select: { id: true },
      // Safety cap on the search step itself — real filtering, sorting,
      // and pagination still happen in the catalog engine afterward.
      take: 200,
    });
    return results.map((r) => r.id);
  }
}

let activeProvider: SearchProvider | null = null;

/**
 * Single place that decides which search backend is active. To move to
 * Meilisearch/Algolia/Elasticsearch/OpenSearch: implement SearchProvider
 * against that service, then swap the class instantiated below. Nothing
 * in src/lib/data/catalog.ts or any UI component needs to change.
 */
export function getSearchProvider(): SearchProvider {
  if (!activeProvider) {
    activeProvider = new PrismaSearchProvider();
  }
  return activeProvider;
}
