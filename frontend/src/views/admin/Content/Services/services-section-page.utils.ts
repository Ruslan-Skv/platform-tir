export function parseFeatures(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatFeatures(features: string[]): string {
  return features.join('\n');
}
