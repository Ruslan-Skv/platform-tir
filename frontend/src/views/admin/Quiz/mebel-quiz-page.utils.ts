export function fileLabelFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const withoutQuery = url.split('?')[0] ?? url;
  const name = withoutQuery.split('/').pop();
  if (!name) return url;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
