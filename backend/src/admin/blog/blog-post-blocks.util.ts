import { BadRequestException } from '@nestjs/common';
import { BlogPostBlockDto } from './dto/blog-post-block.dto';

/** ~200 слов/мин для русскоязычного текста; не менее 1 мин. */
export function computeReadingTimeMinutes(content: string): number {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function assertFeaturedImageAlt(featuredImage: string | null, featuredImageAlt: string) {
  if (featuredImage && !featuredImageAlt.trim()) {
    throw new BadRequestException('Alt-текст обязателен при указании изображения статьи');
  }
}

export function assertBlogBlocks(blocks: BlogPostBlockDto[] | undefined) {
  if (!blocks?.length) return;
  blocks.forEach((b, i) => {
    const text = (b.bodyHtml ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const hasImages = (b.images?.length ?? 0) > 0;
    if (!text && !hasImages) {
      throw new BadRequestException(`Блок ${i + 1}: добавьте текст или хотя бы одно изображение`);
    }
    for (const img of b.images ?? []) {
      if (!img.url?.trim()) {
        throw new BadRequestException(`Блок ${i + 1}: пустой URL изображения`);
      }
    }
  });
}

export function mergeContentFromBlocks(blocks: BlogPostBlockDto[]): string {
  return [...blocks]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((b) => b.bodyHtml)
    .join('');
}

export function mapBlocksForCreate(blocks: BlogPostBlockDto[]) {
  const sorted = [...blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return sorted.map((block, idx) => ({
    sortOrder: block.sortOrder ?? idx,
    bodyHtml: block.bodyHtml,
    images: {
      create: (block.images ?? []).map((img, j) => ({
        url: img.url.trim(),
        alt: (img.alt ?? '').trim(),
        sortOrder: img.sortOrder ?? j,
      })),
    },
  }));
}
