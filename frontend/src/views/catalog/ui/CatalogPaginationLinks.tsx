import {
  type CatalogPaginationLinksInput,
  buildCatalogPaginationUrl,
} from '@/views/catalog/lib/catalog-seo';

/** SSR: <link rel="prev|next"> — Next.js поднимает в <head>. */
export function CatalogPaginationLinks(input: CatalogPaginationLinksInput) {
  const { prev, next } = buildCatalogPaginationUrl(input);
  return (
    <>
      {prev ? <link rel="prev" href={prev} /> : null}
      {next ? <link rel="next" href={next} /> : null}
    </>
  );
}
