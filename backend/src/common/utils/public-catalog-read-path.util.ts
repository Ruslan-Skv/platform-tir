const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Публичное чтение каталога на legacy-маршрутах /products, /categories, /product-components
 * (без прав админки). Мутации и admin/* сюда не входят.
 */
export function isPublicLegacyCatalogReadRequest(method: string, requestPath: string): boolean {
  if (MUTATION_METHODS.has(method.toUpperCase())) {
    return false;
  }

  const path = requestPath.split('?')[0] ?? requestPath;

  if (path.startsWith('/api/v1/products/admin/') || path.startsWith('/api/v1/products/scrape/')) {
    return false;
  }

  if (path.startsWith('/api/v1/product-components/admin/')) {
    return false;
  }

  if (path === '/api/v1/products' || path.startsWith('/api/v1/products/')) {
    return true;
  }

  if (path.startsWith('/api/v1/product-components')) {
    return true;
  }

  if (path === '/api/v1/categories' || path.startsWith('/api/v1/categories/')) {
    return true;
  }

  return false;
}
