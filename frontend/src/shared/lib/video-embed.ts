export type VideoEmbedProvider = 'youtube' | 'vimeo' | 'rutube' | 'native';

export type VideoEmbedInfo =
  | { provider: Exclude<VideoEmbedProvider, 'native'>; embedUrl: string }
  | { provider: 'native'; nativeUrl: string };

const RUTUBE_VIDEO_ID = /[a-f0-9]{32}/i;

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
