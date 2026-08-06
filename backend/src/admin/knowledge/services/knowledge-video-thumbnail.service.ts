import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { KnowledgeMaterialType } from '@prisma/client';

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

      // VK: автопревью часто отдаёт логотип/мусор — не используем.
      if (this.isVkVideoUrl(url)) {
        return { thumbnailUrl: null };
      }

      return { thumbnailUrl: null };
    } catch (err) {
      this.logger.warn(
        `Не удалось получить превью для видео: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { thumbnailUrl: null };
    }
  }

  /**
   * Для внешних VIDEO без обложки подтягиваем превью (Rutube/Vimeo/YouTube).
   * Нативные MP4 и VK не трогаем.
   */
  async resolveForMaterial(
    type: KnowledgeMaterialType,
    videoUrl: string | null | undefined,
    thumbnailUrl: string | null | undefined,
  ): Promise<string | null> {
    const existing = thumbnailUrl?.trim() || null;
    if (existing) return existing;
    if (type !== KnowledgeMaterialType.VIDEO) return null;
    const url = videoUrl?.trim();
    if (!url || this.isNativeVideoFileUrl(url) || this.isVkVideoUrl(url)) return null;
    try {
      const resolved = await this.resolveThumbnailUrl(url);
      return resolved.thumbnailUrl?.trim() || null;
    } catch {
      return null;
    }
  }

  private isNativeVideoFileUrl(url: string): boolean {
    const trimmed = url.trim();
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed) || trimmed.startsWith('/uploads/');
  }

  private isVkVideoUrl(url: string): boolean {
    return VK_HOST.test(url) || /\/video(-?\d+)_(\d+)/i.test(url);
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
}
