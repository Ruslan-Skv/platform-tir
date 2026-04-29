function flattenForTemplate(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out[prefix] = String(obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenForTemplate(v, key));
    } else {
      out[key] = v === null || v === undefined ? '' : String(v);
    }
  }
  return out;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTemplateValue(path: string, raw: string): string {
  const trimmed = raw.trim();
  const fallback = path.startsWith('customer.') && !trimmed ? 'Не предоставлено' : trimmed;
  const safe = escapeHtml(fallback || '__________');
  if (path.startsWith('customer.')) {
    return `<strong><em>${safe}</em></strong>`;
  }
  return safe;
}

/** Подстановка плейсхолдеров вида `{{customer.fullName}}` из вложенного объекта данных. */
export function applyTemplate(template: string, data: unknown): string {
  const flat = flattenForTemplate(data);
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) =>
    formatTemplateValue(path, flat[path] ?? '')
  );
}
