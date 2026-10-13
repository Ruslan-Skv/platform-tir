import { ContractDocumentSigningSessionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isUnsignedSigningAttachment } from '../signing-session-documents';
import { isSigningStageTab } from './signing-stage';

/**
 * Этапные документы (договор, акты, Д/с) из уже подписанных (SIGNED) сессий ЭП пакета.
 *
 * Подписи заказчика живут в таблице сессий и переживают любые перезаписи formData
 * пакета (например, автосохранение редактора с устаревшей формой). Поэтому сессии —
 * самостоятельный источник истины о том, что уже подписано: по нему восстанавливается
 * хронология «сначала договор, затем акты и Д/с», даже если статус пакета или
 * contractConcludedAt в formData оказались затёрты.
 */
export async function loadSignedStageTabIds(
  prisma: PrismaService,
  packageId: string,
): Promise<Set<string>> {
  const sessions = await prisma.contractDocumentSigningSession.findMany({
    where: { packageId, status: ContractDocumentSigningSessionStatus.SIGNED },
    select: { documents: true },
  });
  const tabs = new Set<string>();
  for (const session of sessions) {
    const documents = Array.isArray(session.documents) ? (session.documents as unknown[]) : [];
    for (const doc of documents) {
      const meta = doc as { tabId?: unknown; unsignedAttachment?: unknown } | null;
      if (!meta || typeof meta.tabId !== 'string') continue;
      const isUnsignedAttachment =
        meta.unsignedAttachment === true || isUnsignedSigningAttachment({ tabId: meta.tabId });
      if (!isSigningStageTab(meta.tabId) || isUnsignedAttachment) continue;
      tabs.add(meta.tabId);
    }
  }
  return tabs;
}
