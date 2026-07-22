/** Рисует маленький бейдж на фавиконке вкладки (как у мессенджеров). */

const DEFAULT_FAVICON_HREF = '/favicon.svg';
const CANVAS_SIZE = 64;

let baseImagePromise: Promise<HTMLImageElement> | null = null;
let originalIconHref: string | null = null;
let applyGeneration = 0;

function queryIconLinks(): HTMLLinkElement[] {
  return Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]')
  );
}

function rememberOriginalHref(): void {
  if (originalIconHref) return;
  const link = queryIconLinks()[0];
  const href = link?.getAttribute('href');
  originalIconHref = href && !href.startsWith('data:') ? href : DEFAULT_FAVICON_HREF;
}

function loadBaseImage(): Promise<HTMLImageElement> {
  if (!baseImagePromise) {
    baseImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('favicon load failed'));
      img.src = DEFAULT_FAVICON_HREF;
    });
  }
  return baseImagePromise;
}

function setAllIconHrefs(href: string, type?: string): void {
  const links = queryIconLinks();
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    if (type) link.type = type;
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  for (const link of links) {
    if (type) link.type = type;
    link.href = href;
  }
}

function drawBadge(ctx: CanvasRenderingContext2D, count: number): void {
  const label = count > 99 ? '99+' : String(count);
  const isWide = label.length > 1;
  const radius = isWide ? 16 : 14;
  const cx = CANVAS_SIZE - radius - 2;
  const cy = radius + 2;

  ctx.beginPath();
  if (isWide) {
    const halfW = Math.max(radius, 6 + label.length * 7);
    const left = cx - halfW + radius;
    const right = cx + halfW - radius;
    ctx.arc(left, cy, radius, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.arc(right, cy, radius, (Math.PI * 3) / 2, Math.PI / 2);
    ctx.closePath();
  } else {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = '#e11d48';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${isWide ? 22 : 26}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);
}

/**
 * Обновляет фавикон вкладки: при count > 0 рисует красный бейдж с числом,
 * при 0 — возвращает исходную иконку.
 */
export async function setFaviconBadge(count: number): Promise<void> {
  if (typeof document === 'undefined') return;

  const generation = ++applyGeneration;
  rememberOriginalHref();

  if (count <= 0) {
    setAllIconHrefs(originalIconHref || DEFAULT_FAVICON_HREF, 'image/svg+xml');
    return;
  }

  try {
    const img = await loadBaseImage();
    if (generation !== applyGeneration) return;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.min(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight) * 0.88;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (CANVAS_SIZE - w) / 2;
    const y = (CANVAS_SIZE - h) / 2;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(img, x, y, w, h);
    drawBadge(ctx, count);

    if (generation !== applyGeneration) return;
    setAllIconHrefs(canvas.toDataURL('image/png'), 'image/png');
  } catch {
    /* favicon недоступен — тихо игнорируем */
  }
}
