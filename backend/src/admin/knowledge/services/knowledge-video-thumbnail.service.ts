import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const RUTUBE_VIDEO_ID = /[a-f0-9]{32}/i;
const VK_HOST = /(?:^|\/\/)(?:[\w-]+\.)?(?:vk\.com|vkvideo\.ru|vkontakte\.ru)\b/i;

@Injectable()
export class KnowledgeVideoThumbnailService {
  private readonly logger = new Logger(KnowledgeVideoThumbnailService.name);

  async resolveThumbnailUrl(rawUrl: string): Promise<{ thumbnailUrl: string | null }> {
    const url = rawUrl?.trim();
    if (!url) {
      throw new BadRequestException('Укажите url видео');
    }

    try {
      const youtubeId = this.getYoutubeId(url);
      if (youtubeId) {
        return { thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` };
      }

      const rutubeId = this.getRutubeId(url);
      if (rutubeId) {
        const thumbnailUrl = await this.fetchRutubeThumbnail(rutubeId);
        return { thumbnailUrl };
      }

      const vimeoId = this.getVimeoId(url);
      if (vimeoId) {
        const thumbnailUrl = await this.fetchVimeoThumbnail(vimeoId);
        return { thumbnailUrl };
      }

      const vk = this.getVkVideoRef(url);
      if (vk) {
        const thumbnailUrl = await this.fetchVkThumbnail(vk);
        return { thumbnailUrl };
      }

      return { thumbnailUrl: null };
    } catch (err) {
      this.logger.warn(
        `Не удалось получить превью для видео: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { thumbnailUrl: null };
    }
  }

  private getYoutubeId(url: string): string | null {
    const ytMatch =
      url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
      url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    return ytMatch?.[1] ?? null;
  }

  private getVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match?.[1] ?? null;
  }

  private getRutubeId(url: string): string | null {
    const rutubeMatch = url.match(
      /rutube\.ru\/(?:video(?:\/private)?|play\/embed|shorts)\/([a-f0-9]{32})/i,
    );
    if (rutubeMatch?.[1]) return rutubeMatch[1].toLowerCase();
    if (RUTUBE_VIDEO_ID.test(url) && /rutube\.ru/i.test(url)) {
      return url.match(RUTUBE_VIDEO_ID)?.[0]?.toLowerCase() ?? null;
    }
    return null;
  }

  private getVkVideoRef(
    url: string,
  ): { oid: string; id: string; embedUrl: string; pageUrl: string } | null {
    if (!VK_HOST.test(url)) return null;

    let parsed: URL;
    try {
      parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return null;
    }

    const hash = parsed.searchParams.get('hash') ?? undefined;
    const hd = parsed.searchParams.get('hd') ?? undefined;

    let oid: string | null = null;
    let id: string | null = null;

    if (parsed.pathname.includes('video_ext.php')) {
      oid = parsed.searchParams.get('oid');
      id = parsed.searchParams.get('id');
    } else {
      const pathMatch = parsed.pathname.match(/\/video(-?\d+)_(\d+)/i);
      if (pathMatch) {
        const [, oidRaw, videoId] = pathMatch;
        oid =
          parsed.pathname.includes('/video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
        id = videoId;
      } else {
        const zParam = parsed.searchParams.get('z');
        if (zParam) {
          const zMatch = zParam.match(/video(-?\d+)_(\d+)/i);
          if (zMatch) {
            const [, oidRaw, videoId] = zMatch;
            oid = zMatch[0].includes('video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
            id = videoId;
          }
        }
      }
    }

    if (!oid || !id) return null;

    return {
      oid,
      id,
      embedUrl: this.buildVkEmbedUrl(oid, id, hash, hd),
      pageUrl: `https://vk.com/video${oid}_${id}`,
    };
  }

  private buildVkEmbedUrl(oid: string, id: string, hash?: string, hd?: string): string {
    const params = new URLSearchParams({ oid, id });
    if (hash) params.set('hash', hash);
    if (hd) params.set('hd', hd);
    return `https://vk.com/video_ext.php?${params.toString()}`;
  }

  private async fetchRutubeThumbnail(videoId: string): Promise<string | null> {
    const apiUrl = `https://rutube.ru/api/video/${videoId}/?format=json`;
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        thumbnail_url?: string;
        thumbnail?: { url?: string };
      };
      const fromApi = data.thumbnail_url?.trim() || data.thumbnail?.url?.trim() || null;
      if (fromApi) return fromApi;
    }

    // Fallback: redirect endpoint often resolves to a working CDN image.
    const redirectUrl = `https://rutube.ru/api/video/${videoId}/thumbnail/?redirect=1`;
    const head = await fetch(redirectUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (head.ok && /^https?:\/\//i.test(head.url) && !head.url.includes('/thumbnail/')) {
      return head.url;
    }

    return `https://pic.rutubelist.ru/video/${videoId.slice(0, 2)}/${videoId.slice(2, 4)}/${videoId}.jpg`;
  }

  private async fetchVimeoThumbnail(videoId: string): Promise<string | null> {
    const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${videoId}`)}`;
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url?.trim() || null;
  }

  private async fetchVkThumbnail(vk: {
    oid: string;
    id: string;
    embedUrl: string;
    pageUrl: string;
  }): Promise<string | null> {
    for (const page of [vk.embedUrl, vk.pageUrl, `https://vkvideo.ru/video${vk.oid}_${vk.id}`]) {
      const html = await this.fetchHtml(page);
      if (!html) continue;
      const found = this.extractImageFromHtml(html);
      if (found) return found;
    }
    return null;
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private extractImageFromHtml(html: string): string | null {
    const patterns = [
      /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
      /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /background-image:\s*url\((['"]?)(https?:\/\/[^)'"]+)\1\)/i,
      /id=["']player_thumb["'][^>]*src=["'](https?:\/\/[^"']+)["']/i,
      /"(?:thumb(?:Url|nail)?|preview(?:Url)?|photo_800|photo_640|photo_320|image_src)"\s*:\s*"(https?:\\\/\\\/[^"]+)"/i,
      /(https?:\/\/(?:sun\d+-\d+\.userapi\.com|vkuservideo\.(?:net|ru)|vksport\.mycdn\.me)\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp))/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      const raw = match?.[2] || match?.[1];
      if (!raw) continue;
      const normalized = this.normalizeHttpUrl(raw.replace(/\\\//g, '/'));
      if (normalized) return normalized;
    }

    return null;
  }

  private normalizeHttpUrl(value: string): string | null {
    const trimmed = value.trim().replace(/&amp;/g, '&');
    if (!/^https?:\/\//i.test(trimmed)) return null;
    return trimmed;
  }
}
