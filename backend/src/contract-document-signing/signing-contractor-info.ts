import { Logger } from '@nestjs/common';
import type { ContractDocumentPackageKind } from '@prisma/client';

import type { PrismaService } from '../database/prisma.service';

const logger = new Logger('SigningContractorInfo');

/** Профили (реквизиты/подписанты) хранятся в html-колонке как JSON {items: [...]}. */
function parseProfileItems(html: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(html) as { items?: unknown };
    return Array.isArray(parsed?.items) ? (parsed.items as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

/**
 * Реквизиты Подрядчика для штампа ПЭП: из запроса менеджера, иначе — первый глобальный
 * профиль реквизитов/подписантов направления (хранилище страниц «Реквизиты» и «Подписанты»).
 */
export async function resolveContractorInfo(
  prisma: PrismaService,
  kind: ContractDocumentPackageKind,
  input: { contractorLabel?: string | null; contractorSignatory?: string | null },
): Promise<{ contractorLabel: string | null; contractorSignatory: string | null }> {
  let contractorLabel = input.contractorLabel?.trim() || null;
  let contractorSignatory = input.contractorSignatory?.trim() || null;
  if (contractorLabel && contractorSignatory) {
    return { contractorLabel, contractorSignatory };
  }
  try {
    if (!contractorLabel) {
      const row = await prisma.contractDocumentGlobalTemplate.findUnique({
        where: { kind_tab: { kind, tab: 'executor_profiles' } },
        select: { html: true },
      });
      const first = row ? parseProfileItems(row.html)[0] : undefined;
      if (first) {
        const name = String(first.companyName || first.title || '').trim();
        const inn = first.inn ? String(first.inn).trim() : '';
        contractorLabel = [name, inn ? `ИНН ${inn}` : null].filter(Boolean).join(', ') || null;
      }
    }
    if (!contractorSignatory) {
      const row = await prisma.contractDocumentGlobalTemplate.findUnique({
        where: { kind_tab: { kind, tab: 'signatory_profiles' } },
        select: { html: true },
      });
      const first = row ? parseProfileItems(row.html)[0] : undefined;
      if (first) {
        const name = String(first.directorNameNominative || '').trim();
        const basis = first.basis ? String(first.basis).trim() : '';
        if (name) contractorSignatory = [name, basis].filter(Boolean).join(', ');
      }
    }
  } catch (err) {
    logger.warn(`Профили Подрядчика недоступны: ${(err as Error).message}`);
  }
  return { contractorLabel, contractorSignatory };
}

/** ФИО менеджера (для штампа ПЭП Подрядчика при отправке документов). */
export async function managerDisplayName(
  prisma: PrismaService,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;
  const manager = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return [manager?.lastName, manager?.firstName].filter(Boolean).join(' ') || null;
}
