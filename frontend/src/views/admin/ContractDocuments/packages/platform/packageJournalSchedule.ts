import {
  type ContractDocumentPackageStatus,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';

/** Запись в журнал — через 30 минут после последнего изменения данных пакета. */
export const PACKAGE_JOURNAL_DEBOUNCE_MS = 30 * 60 * 1000;

export type PackageJournalFlushPayload = {
  title: string | null;
  formData: Record<string, unknown>;
  status?: ContractDocumentPackageStatus;
  responsibleManagerId?: string | null;
};

export type PackageJournalScheduler = {
  /** Отложить запись в журнал (сбрасывает таймер). */
  schedule: () => void;
  /** Сбросить отложенную запись — версия только что сохранена явно. */
  acknowledgeImmediateVersion: () => void;
  dispose: () => void;
};

export function createPackageJournalScheduler(args: {
  packageId: string;
  getPayload: () => PackageJournalFlushPayload;
  onFlushed?: () => void;
  onFlushError?: (error: unknown) => void;
}): PackageJournalScheduler {
  let timerId: number | null = null;
  let pendingJournal = false;

  const clearTimer = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  };

  const flush = async () => {
    if (!pendingJournal) return;
    clearTimer();
    pendingJournal = false;
    const payload = args.getPayload();
    await updateContractDocumentPackage(args.packageId, {
      title: payload.title,
      formData: payload.formData,
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.responsibleManagerId !== undefined
        ? { responsibleManagerId: payload.responsibleManagerId }
        : {}),
      recordVersion: true,
    });
    args.onFlushed?.();
  };

  return {
    schedule() {
      pendingJournal = true;
      clearTimer();
      timerId = window.setTimeout(() => {
        void flush().catch((error) => {
          pendingJournal = true;
          args.onFlushError?.(error);
        });
      }, PACKAGE_JOURNAL_DEBOUNCE_MS);
    },
    acknowledgeImmediateVersion() {
      pendingJournal = false;
      clearTimer();
    },
    dispose() {
      pendingJournal = false;
      clearTimer();
    },
  };
}
