import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type PathEntry = string | { path: string; type?: 'page' | 'layout' };

/**
 * Сброс кэша страниц по запросу (после сохранения товара в админке).
 * Вызывается с админского фронта после create/update товара.
 * Опционально: REVALIDATE_SECRET в .env для защиты от случайных вызовов.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pathEntries = (body.paths ?? (body.path ? [body.path] : [])) as PathEntry[];
    const tags = (body.tags ?? []) as string[];
    const secret = request.headers.get('x-revalidate-secret') ?? body.secret;

    const expectedSecret = process.env.REVALIDATE_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!pathEntries.length && !tags.length) {
      return NextResponse.json(
        { error: 'Missing path/paths or tags to revalidate' },
        { status: 400 }
      );
    }

    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim()) {
        revalidateTag(tag.trim(), 'max');
      }
    }

    for (const entry of pathEntries) {
      const path = typeof entry === 'string' ? entry : entry?.path;
      const type = typeof entry === 'object' && entry?.type ? entry.type : 'page';
      if (typeof path === 'string' && path.startsWith('/')) {
        revalidatePath(path, type);
      }
    }

    return NextResponse.json({ revalidated: true, paths: pathEntries, tags });
  } catch (err) {
    console.error('Revalidate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Revalidate failed' },
      { status: 500 }
    );
  }
}
