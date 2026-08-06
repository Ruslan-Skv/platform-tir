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
        return {
          thumbnailUrl: `https://pic.rutubelist.ru/video/${rutubeId.slice(0, 2)}/${rutubeId.slice(2, 4)}/${rutubeId}.jpg`,
        };
      }

      const vimeoId = this.getVimeoId(url);
      if (vimeoId) {
        const thumbnailUrl = await this.fetchVimeoThumbnail(vimeoId);
        return { thumbnailUrl };
      }

      const vkEmbedUrl = this.getVkEmbedUrl(url);
      if (vkEmbedUrl) {
        const thumbnailUrl = await this.fetchVkThumbnail(vkEmbedUrl);
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

  private getVkEmbedUrl(url: string): string | null {
    if (!VK_HOST.test(url)) return null;

    let parsed: URL;
    try {
      parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return null;
    }

    const hash = parsed.searchParams.get('hash') ?? undefined;
    const hd = parsed.searchParams.get('hd') ?? undefined;

    if (parsed.pathname.includes('video_ext.php')) {
      const oid = parsed.searchParams.get('oid');
      const id = parsed.searchParams.get('id');
      if (oid && id) return this.buildVkEmbedUrl(oid, id, hash, hd);
      return null;
    }

    const pathMatch = parsed.pathname.match(/\/video(-?\d+)_(\d+)/i);
    if (pathMatch) {
      const [, oidRaw, id] = pathMatch;
      const oid =
        parsed.pathname.includes('/video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
      return this.buildVkEmbedUrl(oid, id, hash, hd);
    }

    const zParam = parsed.searchParams.get('z');
    if (zParam) {
      const zMatch = zParam.match(/video(-?\d+)_(\d+)/i);
      if (zMatch) {
        const [, oidRaw, id] = zMatch;
        const oid = zMatch[0].includes('video-') && !oidRaw.startsWith('-') ? `-${oidRaw}` : oidRaw;
        return this.buildVkEmbedUrl(oid, id, hash, hd);
      }
    }

    return null;
  }

  private buildVkEmbedUrl(oid: string, id: string, hash?: string, hd?: string): string {
    const params = new URLSearchParams({ oid, id });
    if (hash) params.set('hash', hash);
    if (hd) params.set('hd', hd);
    return `https://vk.com/video_ext.php?${params.toString()}`;
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

  private async fetchVkThumbnail(embedUrl: string): Promise<string | null> {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogMatch =
      html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch?.[1]) return this.normalizeHttpUrl(ogMatch[1]);

    const bgMatch = html.match(/background-image:\s*url\((['"]?)(https?:\/\/[^)'"]+)\1\)/i);
    if (bgMatch?.[2]) return this.normalizeHttpUrl(bgMatch[2]);

    const playerThumb = html.match(/id=["']player_thumb["'][^>]*src=["'](https?:\/\/[^"']+)["']/i);
    if (playerThumb?.[1]) return this.normalizeHttpUrl(playerThumb[1]);

    return null;
  }

  private normalizeHttpUrl(value: string): string | null {
    const trimmed = value.trim().replace(/&amp;/g, '&');
    if (!/^https?:\/\//i.test(trimmed)) return null;
    return trimmed;
  }
}
