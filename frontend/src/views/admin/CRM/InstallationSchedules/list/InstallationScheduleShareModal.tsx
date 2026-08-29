'use client';

import { useEffect, useMemo, useState } from 'react';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { Modal } from '@/shared/ui/Modal';
import { CopyIcon } from '@/shared/ui/icons';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { formatCrmPhoneInput } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import {
  buildWorkOrderPdfFileForInstallationSchedule,
  canShareWorkOrderPdfFile,
  downloadWorkOrderPdfForInstallationSchedule,
} from '@/views/admin/ContractDocuments/packages/platform/workOrders/buildWorkOrderPdfForInstallationSchedule';

import styles from '../shared/InstallationSchedules.module.css';
import {
  type MessengerShareChannel,
  buildInstallationScheduleShareMessage,
  buildMessengerShareUrl,
} from '../shared/installationScheduleShare';

type Props = {
  item: InstallationSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  /** Подстановка телефона монтажника из справочника мастеров. */
  initialInstallerPhone?: string;
};

export function InstallationScheduleShareModal({
  item,
  isOpen,
  onClose,
  initialInstallerPhone = '',
}: Props) {
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [canNativeSharePdf, setCanNativeSharePdf] = useState(false);

  const message = useMemo(() => (item ? buildInstallationScheduleShareMessage(item) : ''), [item]);

  const hasLinkedPackage = Boolean(item?.packageId?.trim());

  useEffect(() => {
    if (!isOpen) return;
    setPhone(initialInstallerPhone ? formatCrmPhoneInput(initialInstallerPhone) : '');
    setCopied(false);
    setPdfError(null);
    setPdfBusy(false);
    setCanNativeSharePdf(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function'
    );
  }, [isOpen, item?.id, initialInstallerPhone]);

  const openChannel = (channel: MessengerShareChannel) => {
    if (!message) return;
    const url = buildMessengerShareUrl(channel, message, phone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const downloadPdf = async () => {
    if (!item || !hasLinkedPackage) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadWorkOrderPdfForInstallationSchedule(item);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Не удалось сформировать PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const shareTextAndPdf = async () => {
    if (!item || !hasLinkedPackage || !message) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const file = await buildWorkOrderPdfFileForInstallationSchedule(item);
      if (!canShareWorkOrderPdfFile(file)) {
        await downloadWorkOrderPdfForInstallationSchedule(item);
        setPdfError(
          'Этот браузер не умеет прикреплять PDF к мессенджеру. PDF скачан — отправьте текст кнопками ниже и приложите файл вручную.'
        );
        return;
      }
      await navigator.share({
        title: 'Заказ-наряд',
        text: message,
        files: [file],
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPdfError(err instanceof Error ? err.message : 'Не удалось поделиться PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setPdfError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Отправить монтажнику"
      size="md"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
      alignTop
    >
      <div
        className={`${panelStyles.formShell} ${styles.shareModalBody}`}
        data-modal-form
        data-modal-density="compact"
      >
        <p data-modal-form-hint className={styles.shareHintDesktop} style={{ marginTop: 0 }}>
          Отправьте текст в Telegram, WhatsApp или MAX и приложите PDF заказ-наряда. На телефоне
          можно сразу «Поделиться» текстом вместе с PDF.
        </p>
        <p data-modal-form-hint className={styles.shareHintMobile} style={{ marginTop: 0 }}>
          Текст + PDF заказ-наряда. Удобнее «Поделиться» — откроется мессенджер с файлом.
        </p>

        <div data-modal-form-group>
          <label htmlFor="is-share-phone">Телефон монтажника (для WhatsApp)</label>
          <input
            id="is-share-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatCrmPhoneInput(e.target.value))}
            placeholder="+7(000)-000-00-00"
            autoComplete="tel"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="is-share-message">Текст сообщения</label>
          <textarea
            id="is-share-message"
            className={styles.shareMessageTextarea}
            rows={5}
            readOnly
            value={message}
          />
        </div>

        <div data-modal-form-group>
          <label>Заказ-наряд (PDF)</label>
          {hasLinkedPackage ? (
            <div className={styles.shareChannelRow}>
              <button
                type="button"
                data-modal-btn="primary"
                disabled={pdfBusy}
                onClick={() => void downloadPdf()}
              >
                {pdfBusy ? 'Готовим PDF…' : 'Скачать PDF'}
              </button>
              {canNativeSharePdf ? (
                <button
                  type="button"
                  data-modal-btn="secondary"
                  disabled={pdfBusy}
                  onClick={() => void shareTextAndPdf()}
                >
                  Поделиться (текст + PDF)
                </button>
              ) : null}
            </div>
          ) : (
            <p className={styles.sharePdfHint}>
              PDF недоступен: к монтажу не привязан заказ. Привяжите пакет в форме монтажа.
            </p>
          )}
          {pdfError ? <p data-modal-form-error>{pdfError}</p> : null}
        </div>

        <div className={styles.shareChannelRow} role="group" aria-label="Мессенджеры">
          <button type="button" data-modal-btn="secondary" onClick={() => openChannel('whatsapp')}>
            WhatsApp
          </button>
          <button type="button" data-modal-btn="secondary" onClick={() => openChannel('telegram')}>
            Telegram
          </button>
          <button type="button" data-modal-btn="secondary" onClick={() => openChannel('max')}>
            MAX
          </button>
          <button type="button" data-modal-btn="secondary" onClick={() => void copyMessage()}>
            <span className={styles.shareCopyBtnInner}>
              <CopyIcon tone="inherit" />
              {copied ? 'Скопировано' : 'Копировать'}
            </span>
          </button>
        </div>

        <div data-modal-form-actions className={styles.shareModalActions}>
          <button type="button" data-modal-btn="secondary" onClick={handleClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
