import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

type PathEntry = string | { path: string; type?: 'page' | 'layout' };

const PUBLIC_ROLES = new Set(['USER', 'GUEST']);

async function isStaffBearerAuthorized(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return false;

  try {
    const profileRes = await fetch(`${getServerApiBaseUrl()}/auth/profile`, {
      headers: { authorization: auth },
      cache: 'no-store',
    });
    if (!profileRes.ok) return false;
    const user = (await profileRes.json()) as { role?: string };
    const role = user?.role;
    return typeof role === 'string' && role.length > 0 && !PUBLIC_ROLES.has(role);
  } catch {
    return false;
  }
}

async function isRevalidateAuthorized(
  request: NextRequest,
  secret: string | undefined
): Promise<boolean> {
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (process.env.NODE_ENV !== 'production' && !expectedSecret) {
    return true;
  }
  if (expectedSecret && secret === expectedSecret) {
    return true;
  }
  return isStaffBearerAuthorized(request);
}

/**
 * Сброс кэша страниц по запросу (после сохранения товара в админке).
 * Вызывается с админского фронта после create/update товара.
 * В production: Bearer сотрудника (apiFetch) или REVALIDATE_SECRET для server-to-server.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pathEntries = (body.paths ?? (body.path ? [body.path] : [])) as PathEntry[];
    const tags = (body.tags ?? []) as string[];
    const secret = request.headers.get('x-revalidate-secret') ?? body.secret;

    if (!(await isRevalidateAuthorized(request, secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
