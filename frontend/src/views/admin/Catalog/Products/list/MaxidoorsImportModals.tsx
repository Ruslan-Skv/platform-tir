'use client';

import type { MaxidoorsCatalogUi, MaxidoorsImportJob } from '@/shared/api/admin-maxidoors-import';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from './MaxidoorsImportModals.module.css';

type TimelineStepStatus = 'pending' | 'active' | 'done' | 'error';

type TimelineStep = {
  id: string;
  title: string;
  detail?: string;
  status: TimelineStepStatus;
};

function buildTimeline(job: MaxidoorsImportJob): TimelineStep[] {
  const isTerminal = job.status === 'done' || job.status === 'error';
  const hasTotal = job.total > 0;
  const pct =
    hasTotal && job.done >= 0 ? Math.min(100, Math.round((job.done / job.total) * 100)) : null;

  const queueStatus: TimelineStepStatus =
    job.status === 'pending' ? 'active' : job.status === 'error' && !hasTotal ? 'error' : 'done';

  const scanStatus: TimelineStepStatus = (() => {
    if (job.status === 'pending') return 'pending';
    if (!hasTotal) {
      if (job.status === 'running') return 'active';
      if (job.status === 'error') return 'error';
      return 'pending';
    }
    return 'done';
  })();

  const importStatus: TimelineStepStatus = (() => {
    if (!hasTotal) return job.status === 'error' ? 'error' : 'pending';
    if (job.status === 'running') return 'active';
    if (job.status === 'done') return 'done';
    if (job.status === 'error') return 'error';
    return 'pending';
  })();

  const reportStatus: TimelineStepStatus = (() => {
    if (!isTerminal) return 'pending';
    return job.status === 'error' ? 'error' : 'done';
  })();

  return [
    {
      id: 'queue',
      title: 'Запуск задания',
      detail:
        queueStatus === 'active'
          ? 'Ожидание очереди…'
          : queueStatus === 'done'
            ? 'Задание принято'
            : undefined,
      status: queueStatus,
    },
    {
      id: 'scan',
      title: 'Сканирование раздела поставщика',
      detail:
        scanStatus === 'active'
          ? 'Собираем список товаров с maxi-doors.ru…'
          : scanStatus === 'done'
            ? `Найдено позиций: ${job.total}`
            : scanStatus === 'error'
              ? 'Не удалось получить список'
              : 'Ожидание…',
      status: scanStatus,
    },
    {
      id: 'import',
      title: 'Загрузка товаров',
      detail:
        importStatus === 'active'
          ? `Обработано ${job.done} из ${job.total}${pct != null ? ` · ${pct}%` : ''}`
          : importStatus === 'done'
            ? `Обработано ${job.done} из ${job.total}`
            : importStatus === 'error'
              ? `Остановка на ${job.done} из ${job.total || '…'}`
              : 'Ожидание списка…',
      status: importStatus,
    },
    {
      id: 'report',
      title: job.status === 'error' ? 'Завершено с ошибкой' : 'Итоги импорта',
      detail: isTerminal
        ? [
            `создано ${job.created}`,
            `пропущено ${job.skipped}`,
            `нет у поставщика ${job.missingItems?.length ?? 0}`,
            `ошибок ${job.errors.length}`,
          ].join(' · ')
        : 'Появится после завершения',
      status: reportStatus,
    },
  ];
}

function StepMarker({ status }: { status: TimelineStepStatus }) {
  const label = status === 'done' ? '✓' : status === 'error' ? '!' : status === 'active' ? '' : '';
  return (
    <span className={`${styles.marker} ${styles[`marker_${status}`]}`} aria-hidden>
      {label}
      {status === 'active' ? <span className={styles.markerPulse} /> : null}
    </span>
  );
}

type ConfirmProps = {
  open: boolean;
  catalog: MaxidoorsCatalogUi | null;
  starting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function MaxidoorsImportConfirmModal({
  open,
  catalog,
  starting,
  error,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!starting) onClose();
      }}
      title="Импорт с сайта Максидорс"
      size="lg"
      className={`${crmFormStyles.modalPanel} ${styles.modalPanel}`}
      showCloseButton={!starting}
    >
      <div
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          {error
            ? error
            : catalog?.confirmMessage ||
              'Будут созданы товары с сайта maxi-doors.ru. Уже импортированные (по ссылке на карточку) будут пропущены.'}
        </p>

        {catalog ? (
          <div className={styles.confirmMeta}>
            <div data-modal-form-group>
              <label>Раздел поставщика</label>
              <p className={styles.confirmValue}>{catalog.label}</p>
            </div>
            <div data-modal-form-group>
              <label>Категория на сайте</label>
              <p className={styles.confirmValue}>{catalog.categoryNames[0] ?? '—'}</p>
            </div>
          </div>
        ) : null}

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={starting} onClick={onClose}>
            Отмена
          </button>
          <button type="button" data-modal-btn="primary" disabled={starting} onClick={onConfirm}>
            {starting ? 'Запуск…' : 'Начать импорт'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

type ProgressProps = {
  job: MaxidoorsImportJob | null;
  catalogLabel?: string | null;
  error: string | null;
  onClose: () => void;
};

export function MaxidoorsImportProgressModal({ job, catalogLabel, error, onClose }: ProgressProps) {
  const open = Boolean(job);
  const terminal = job?.status === 'done' || job?.status === 'error';
  const steps = job ? buildTimeline(job) : [];
  const importStep = steps.find((s) => s.id === 'import');
  const progressPct =
    job && job.total > 0 ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Импорт Максидорс${catalogLabel ? `: ${catalogLabel}` : ''}`}
      titleAside={
        <>
          {job && !terminal && job.total > 0 ? (
            <span className={styles.titleProgress}>
              {job.done} / {job.total}
            </span>
          ) : null}
          <AdminSaveNotice visible={job?.status === 'done'}>Готово</AdminSaveNotice>
        </>
      }
      size="lg"
      className={`${crmFormStyles.modalPanel} ${styles.modalPanel}`}
      showCloseButton={Boolean(terminal || !job)}
    >
      {job ? (
        <div
          className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell} ${styles.body}`}
          data-modal-form
          data-modal-density="compact"
        >
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            {job.message ||
              (terminal
                ? 'Импорт завершён. Ниже — таймлайн и отчёт по созданным и отсутствующим позициям.'
                : 'Идёт перенос товаров с maxi-doors.ru. Не закрывайте окно до завершения.')}
          </p>

          <ol className={styles.timeline} aria-label="Ход импорта">
            {steps.map((step, index) => (
              <li key={step.id} className={`${styles.step} ${styles[`step_${step.status}`]}`}>
                <div className={styles.rail}>
                  <StepMarker status={step.status} />
                  {index < steps.length - 1 ? <span className={styles.railLine} /> : null}
                </div>
                <div className={styles.stepBody}>
                  <p className={styles.stepTitle}>{step.title}</p>
                  {step.detail ? <p className={styles.stepDetail}>{step.detail}</p> : null}
                  {step.id === 'import' &&
                  (importStep?.status === 'active' || importStep?.status === 'done') &&
                  job.total > 0 ? (
                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-valuenow={progressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {error ? <p data-modal-form-error>{error}</p> : null}

          {(job.createdItems?.length ?? 0) > 0 ? (
            <div className={styles.report}>
              <p className={styles.reportTitle}>Новые товары ({job.createdItems!.length})</p>
              <ul className={styles.reportList}>
                {job.createdItems!.slice(0, 30).map((item) => (
                  <li key={item.url || item.productId || item.name}>
                    {item.name}
                    {item.supplierSku ? ` · арт. ${item.supplierSku}` : ''}
                  </li>
                ))}
                {job.createdItems!.length > 30 ? (
                  <li>…и ещё {job.createdItems!.length - 30}</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {(job.missingItems?.length ?? 0) > 0 ? (
            <div className={styles.report}>
              <p className={styles.reportTitle}>Нет у поставщика ({job.missingItems!.length})</p>
              <p className={styles.reportHint}>
                Ранее импортированы, но сейчас отсутствуют в разделе на maxi-doors.ru. Не удаляются
                автоматически — проверьте вручную.
              </p>
              <ul className={styles.reportList}>
                {job.missingItems!.slice(0, 30).map((item) => (
                  <li key={item.productId || item.url || item.name}>
                    {item.name}
                    {item.supplierSku ? ` · арт. ${item.supplierSku}` : ''}
                  </li>
                ))}
                {job.missingItems!.length > 30 ? (
                  <li>…и ещё {job.missingItems!.length - 30}</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {job.errors.length > 0 ? (
            <div className={styles.report}>
              <p className={styles.reportTitle}>Ошибки ({job.errors.length})</p>
              <ul className={styles.reportList}>
                {job.errors.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {job.errors.length > 8 ? <li>…и ещё {job.errors.length - 8}</li> : null}
              </ul>
            </div>
          ) : null}

          {terminal ? (
            <div data-modal-form-actions>
              <button type="button" data-modal-btn="primary" onClick={onClose}>
                Закрыть
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
