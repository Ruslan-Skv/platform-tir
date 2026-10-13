import { ContractDocumentPackageStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { loadSignedStageTabIds } from './signing-stage-evidence';

/**
 * Окно, в котором интерфейс хаба разрешает снять отметку о подписании
 * (отмена подписания договора, снятие отметки с Д/с). Вне окна любое
 * «обнуление» признаков подписания в приходящей форме — это устаревшая
 * форма редактора, а не осознанное действие. Зеркалит фронтенд-константу
 * CONTRACT_SIGNED_REVERT_WINDOW_MS (packageHubConstants.ts).
 */
export const REMOTE_SIGNING_CONCLUSION_REVERT_WINDOW_MS = 30 * 1000;

/** Поля formData, которые ЭП-флоу пишет в formData при подписании актов. */
const ACT_SIGNS: Array<{
  evidenceTab: string;
  fields: string[];
}> = [
  {
    evidenceTab: 'actStart',
    fields: ['repairWorkStartActSignedAt', 'repairWorkStartActPhotoUrl'],
  },
  {
    evidenceTab: 'actAcceptance',
    fields: [
      'repairContractCloseActSignedAt',
      'repairContractCloseActPhotoUrl',
      'repairContractClosed',
      'contractClosed',
    ],
  },
];

function plainObject(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function trimmedString(form: Record<string, unknown> | null, key: string): string {
  const value = form?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** true — метка времени свежее окна отката (отметку ещё можно снять вручную). */
function withinRevertWindow(iso: string, now: number): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) && now - ts <= REMOTE_SIGNING_CONCLUSION_REVERT_WINDOW_MS;
}

export type RemoteSigningPreservationInput = {
  storedFormData: unknown;
  /** formData из запроса; undefined — обновление без formData (например, только статус). */
  incomingFormData: unknown;
  incomingStatus?: ContractDocumentPackageStatus;
  storedStatus: ContractDocumentPackageStatus;
  /** Текущее время (для окна отката); по умолчанию Date.now(). */
  now?: number;
};

/**
 * Какие подписанные (SIGNED) сессии ЭП нужно подтвердить, чтобы применить защиту.
 * Пустое множество — запрос к БД не нужен: все найденные регрессы защищаются
 * безусловно (вне окна отката) либо не требуют защиты.
 */
export function remoteSigningPreservationEvidenceTabs(
  input: RemoteSigningPreservationInput,
): Set<string> {
  const now = input.now ?? Date.now();
  const stored = plainObject(input.storedFormData);
  const incoming = plainObject(input.incomingFormData);
  const tabs = new Set<string>();
  if (!stored) return tabs;

  const storedConcludedAt = trimmedString(stored, 'contractConcludedAt');

  // Дата заключения договора обнуляется устаревшей формой.
  if (
    incoming &&
    storedConcludedAt &&
    !trimmedString(incoming, 'contractConcludedAt') &&
    withinRevertWindow(storedConcludedAt, now)
  ) {
    tabs.add('contract');
  }

  // Статус «Договор подписан» откатывается устаревшей формой/статусом хаба.
  if (
    input.incomingStatus !== undefined &&
    input.storedStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    input.incomingStatus !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    (!storedConcludedAt || withinRevertWindow(storedConcludedAt, now))
  ) {
    tabs.add('contract');
  }

  // Слоты Д/с: подписанный слот «открывается» устаревшей формой.
  if (incoming) {
    const storedSlots = Array.isArray(stored.addendumSlots) ? stored.addendumSlots : [];
    const incomingSlots = Array.isArray(incoming.addendumSlots) ? incoming.addendumSlots : [];
    for (let i = 0; i < 5; i++) {
      const storedSlot = plainObject(storedSlots[i]);
      if (!storedSlot || storedSlot.status !== 'SIGNED') continue;
      if (plainObject(incomingSlots[i])?.status === 'SIGNED') continue;
      const signedAt = trimmedString(storedSlot, 'signedAt');
      // Без метки времени снятие подписи недоступно и в UI — защита безусловная.
      if (signedAt && withinRevertWindow(signedAt, now)) tabs.add(`addendum${i + 1}`);
    }
  }

  // Акты: поля подписанного акта обнуляются — подтверждаем сессией ЭП.
  if (incoming) {
    for (const sign of ACT_SIGNS) {
      if (actFieldsRegressed(stored, incoming, sign.fields)) tabs.add(sign.evidenceTab);
    }
  }

  return tabs;
}

function actFieldsRegressed(
  stored: Record<string, unknown>,
  incoming: Record<string, unknown>,
  fields: string[],
): boolean {
  for (const field of fields) {
    const storedValue = stored[field];
    if (typeof storedValue === 'boolean') {
      if (storedValue === true && incoming[field] !== true) return true;
    } else if (trimmedString(stored, field) !== '' && trimmedString(incoming, field) === '') {
      return true;
    }
  }
  return false;
}

/**
 * Маркер `_remoteSigning` в formData принадлежит серверу (его пишет и чистит
 * только ЭП-флоу): любое обновление пакета восстанавливает хранимое значение,
 * чтобы устаревшая форма редактора не теряла статус «На согласовании».
 */
export function withServerOwnedRemoteSigningMarker(
  storedFormData: unknown,
  incomingFormData: unknown,
): unknown {
  const incoming = plainObject(incomingFormData);
  if (!incoming) return incomingFormData;
  const stored = plainObject(storedFormData);
  const result = { ...incoming };
  if (stored && '_remoteSigning' in stored) {
    result._remoteSigning = stored._remoteSigning;
  } else {
    delete result._remoteSigning;
  }
  return result;
}

/**
 * Восстанавливает в приходящей форме/статусе признаки подписания, записанные
 * ЭП-флоу или ручным подписанием, если устаревшая форма редактора их затирает:
 *
 * - `contractConcludedAt` и статус CONTRACT_CONCLUDED — вне окна отката всегда,
 *   внутри окна — только когда договор подписан по ЭП (SIGNED-сессия);
 * - слоты Д/с со статусом SIGNED — вне окна отката или без метки времени всегда,
 *   внутри окна — только при подписанной сессии ЭП этого Д/с;
 * - поля актов — только при подписанной сессии ЭП соответствующего акта.
 *
 * Возвращает скорректированные форму и статус; `preserved` — список защищённых
 * полей (для журналирования).
 */
export function applyRemoteSigningPreservation(
  input: RemoteSigningPreservationInput & { signedStageTabs: ReadonlySet<string> },
): {
  formData: Record<string, unknown> | null;
  status?: ContractDocumentPackageStatus;
  preserved: string[];
} {
  const now = input.now ?? Date.now();
  const stored = plainObject(input.storedFormData);
  const incoming = plainObject(input.incomingFormData);
  const signedTabs = input.signedStageTabs;
  const preserved: string[] = [];

  let formData: Record<string, unknown> | null = incoming ? { ...incoming } : null;
  if (formData) {
    formData = plainObject(withServerOwnedRemoteSigningMarker(stored, formData)) as Record<
      string,
      unknown
    >;
  }

  const storedConcludedAt = stored ? trimmedString(stored, 'contractConcludedAt') : '';
  const conclusionOutsideWindow =
    storedConcludedAt !== '' && !withinRevertWindow(storedConcludedAt, now);
  const conclusionProtected = conclusionOutsideWindow || signedTabs.has('contract');

  // Дата заключения договора.
  if (
    formData &&
    storedConcludedAt &&
    !trimmedString(formData, 'contractConcludedAt') &&
    conclusionProtected
  ) {
    formData.contractConcludedAt = storedConcludedAt;
    preserved.push('contractConcludedAt');
  }

  // Статус пакета «Договор подписан».
  let status = input.incomingStatus;
  if (
    status !== undefined &&
    input.storedStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    status !== ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    conclusionProtected
  ) {
    status = ContractDocumentPackageStatus.CONTRACT_CONCLUDED;
    preserved.push('status:CONTRACT_CONCLUDED');
  }

  // Слоты Д/с.
  if (formData) {
    const storedSlots = Array.isArray(stored?.addendumSlots) ? stored.addendumSlots : [];
    const incomingSlots = Array.isArray(formData.addendumSlots)
      ? [...(formData.addendumSlots as unknown[])]
      : Array.isArray(stored?.addendumSlots)
        ? [...(stored.addendumSlots as unknown[])]
        : [];
    let slotsChanged = false;
    for (let i = 0; i < 5; i++) {
      const storedSlot = plainObject(storedSlots[i]);
      if (!storedSlot || storedSlot.status !== 'SIGNED') continue;
      if (plainObject(incomingSlots[i])?.status === 'SIGNED') continue;
      const signedAt = trimmedString(storedSlot, 'signedAt');
      const slotProtected =
        signedAt === '' || !withinRevertWindow(signedAt, now) || signedTabs.has(`addendum${i + 1}`);
      if (slotProtected) {
        incomingSlots[i] = storedSlot;
        slotsChanged = true;
        preserved.push(`addendumSlots[${i}].status=SIGNED`);
      }
    }
    if (slotsChanged) formData.addendumSlots = incomingSlots;
  }

  // Акты — только при подтверждении подписанной сессией ЭП.
  if (formData && stored) {
    for (const sign of ACT_SIGNS) {
      if (!signedTabs.has(sign.evidenceTab)) continue;
      for (const field of sign.fields) {
        const storedValue = stored[field];
        const regressed =
          typeof storedValue === 'boolean'
            ? storedValue === true && formData[field] !== true
            : trimmedString(stored, field) !== '' && trimmedString(formData, field) === '';
        if (regressed) {
          formData[field] = storedValue;
          preserved.push(field);
        }
      }
    }
  }

  return { formData, status, preserved };
}

/**
 * Проводка защиты для обновления пакета: находит регрессы признаков подписания,
 * подтверждает их подписанными (SIGNED) сессиями ЭП (запрос к БД — только когда
 * есть что подтверждать) и возвращает скорректированные форму и статус для записи.
 */
export async function preserveRemoteSigningStateOnUpdate(
  prisma: PrismaService,
  input: RemoteSigningPreservationInput & {
    packageId: string;
    /** Логгер вызывающей стороны для журналирования восстановленных полей. */
    logger?: { warn: (message: string) => void };
  },
): Promise<{
  formToUpdate: unknown;
  statusToUpdate?: ContractDocumentPackageStatus;
}> {
  const evidenceTabs = remoteSigningPreservationEvidenceTabs(input);
  const signedStageTabs =
    evidenceTabs.size > 0
      ? await loadSignedStageTabIds(prisma, input.packageId)
      : new Set<string>();
  const preservation = applyRemoteSigningPreservation({ ...input, signedStageTabs });
  if (input.logger && preservation.preserved.length > 0) {
    input.logger.warn(
      `Восстановлены признаки подписания пакета ${input.packageId}, затёртые устаревшей формой: ${preservation.preserved.join(', ')}`,
    );
  }
  return {
    formToUpdate: preservation.formData ?? input.incomingFormData,
    statusToUpdate: preservation.status,
  };
}
