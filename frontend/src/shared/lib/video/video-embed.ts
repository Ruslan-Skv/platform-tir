export type VideoEmbedProvider = 'youtube' | 'vimeo' | 'rutube' | 'vk' | 'native';

export type VideoEmbedInfo =
  | { provider: Exclude<VideoEmbedProvider, 'native'>; embedUrl: string }
  | { provider: 'native'; nativeUrl: string };

const RUTUBE_VIDEO_ID = /[a-f0-9]{32}/i;
const VK_HOST = /(?:^|\/\/)(?:[\w-]+\.)?(?:vk\.com|vkvideo\.ru|vkontakte\.ru)\b/i;

function buildVkEmbedUrl(oid: string, id: string, hash?: string, hd?: string): string {
  const params = new URLSearchParams({ oid, id });
  if (hash) params.set('hash', hash);
  if (hd) params.set('hd', hd);
  return `https://vk.com/video_ext.php?${params.toString()}`;
}

function parseVkVideoEmbed(trimmed: string): VideoEmbedInfo | null {
  if (!VK_HOST.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!VK_HOST.test(url.href)) return null;

  const hashFromQuery = url.searchParams.get('hash') ?? undefined;
  const hdFromQuery = url.searchParams.get('hd') ?? undefined;

  if (url.pathname.includes('video_ext.php')) {
    const oid = url.searchParams.get('oid');
    const id = url.searchParams.get('id');
    if (oid && id) {
      return {
        provider: 'vk',
        embedUrl: buildVkEmbedUrl(oid, id, hashFromQuery ?? undefined, hdFromQuery ?? undefined),
      };
    }
    return null;
  }

  const pathMatch = url.pathname.match(/\/video(-?\d+)_(\d+)/i);
  if (pathMatch) {
    const [, oidRaw, id] = pathMatch;
    const oid = url.pathname.includes('/video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
    return {
      provider: 'vk',
      embedUrl: buildVkEmbedUrl(oid, id, hashFromQuery, hdFromQuery),
    };
  }

  const zParam = url.searchParams.get('z');
  if (zParam) {
    const zMatch = zParam.match(/video(-?\d+)_(\d+)/i);
    if (zMatch) {
      const [, oidRaw, id] = zMatch;
      const oid = zMatch[0].includes('video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
      return {
        provider: 'vk',
        embedUrl: buildVkEmbedUrl(oid, id, hashFromQuery, hdFromQuery),
      };
    }
  }

  return null;
}

export function parseVideoEmbed(url: string): VideoEmbedInfo | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  const rutubeMatch = trimmed.match(
    /rutube\.ru\/(?:video(?:\/private)?|play\/embed|shorts)\/([a-f0-9]{32})/i
  );
  if (rutubeMatch) {
    return {
      provider: 'rutube',
      embedUrl: `https://rutube.ru/play/embed/${rutubeMatch[1]}`,
    };
  }

  if (RUTUBE_VIDEO_ID.test(trimmed) && /rutube\.ru/i.test(trimmed)) {
    const idMatch = trimmed.match(RUTUBE_VIDEO_ID);
    if (idMatch) {
      return {
        provider: 'rutube',
        embedUrl: `https://rutube.ru/play/embed/${idMatch[0]}`,
      };
    }
  }

  const vkEmbed = parseVkVideoEmbed(trimmed);
  if (vkEmbed) return vkEmbed;

  return { provider: 'native', nativeUrl: trimmed };
}

export function isNativeVideoFileUrl(url: string): boolean {
  const parsed = parseVideoEmbed(url);
  if (!parsed || parsed.provider !== 'native') return false;
  const trimmed = parsed.nativeUrl.trim();
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed) || trimmed.startsWith('/uploads/');
}

export function isEmbeddedVideoProvider(url: string): boolean {
  const parsed = parseVideoEmbed(url);
  return parsed !== null && parsed.provider !== 'native';
}

export function getYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  return ytMatch?.[1] ?? null;
}

export function getVimeoVideoId(url: string): string | null {
  const match = url.trim().match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function getRutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  const rutubeMatch = trimmed.match(
    /rutube\.ru\/(?:video(?:\/private)?|play\/embed|shorts)\/([a-f0-9]{32})/i
  );
  if (rutubeMatch?.[1]) return rutubeMatch[1].toLowerCase();
  if (RUTUBE_VIDEO_ID.test(trimmed) && /rutube\.ru/i.test(trimmed)) {
    const idMatch = trimmed.match(RUTUBE_VIDEO_ID);
    return idMatch?.[0]?.toLowerCase() ?? null;
  }
  return null;
}

export function getVkVideoRef(url: string): { oid: string; id: string; embedUrl: string } | null {
  const parsed = parseVkVideoEmbed(url.trim());
  if (!parsed || parsed.provider !== 'vk') return null;
  try {
    const embed = new URL(parsed.embedUrl);
    const oid = embed.searchParams.get('oid');
    const id = embed.searchParams.get('id');
    if (!oid || !id) return null;
    return { oid, id, embedUrl: parsed.embedUrl };
  } catch {
    return null;
  }
}

/** Прямой URL превью для YouTube (если распознан). */
export function getYoutubeThumbnailUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * @deprecated Нестабильный CDN-шаблон; превью Rutube лучше брать через API.
 * Оставлено для тестов совместимости.
 */
export function getRutubeThumbnailUrl(url: string): string | null {
  const id = getRutubeVideoId(url);
  if (!id || id.length < 4) return null;
  return `https://pic.rutubelist.ru/video/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.jpg`;
}

/** Синхронные превью без доп. запросов (только YouTube — стабильный CDN). */
export function getSyncVideoThumbnailUrl(url: string): string | null {
  return getYoutubeThumbnailUrl(url);
}

export function isVkVideoUrl(url: string): boolean {
  return parseVideoEmbed(url)?.provider === 'vk';
}

/** Нужен ли async-запрос за превью (Rutube / Vimeo). VK даёт нестабильные превью — иконка. */
export function needsAsyncVideoThumbnail(url: string): boolean {
  if (getSyncVideoThumbnailUrl(url) || isNativeVideoFileUrl(url) || isVkVideoUrl(url)) {
    return false;
  }
  const parsed = parseVideoEmbed(url);
  return parsed?.provider === 'rutube' || parsed?.provider === 'vimeo';
}

/** URL загруженного видеофайла без media-fragment (кадр берём через seek в UI). */
export function getNativeVideoPosterSrc(url: string): string | null {
  if (!isNativeVideoFileUrl(url)) return null;
  const base = url.trim();
  if (!base) return null;
  return base.replace(/#.*$/, '');
}
