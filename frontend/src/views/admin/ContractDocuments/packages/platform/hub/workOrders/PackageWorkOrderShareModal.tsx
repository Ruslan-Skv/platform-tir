'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import { CopyIcon } from '@/shared/ui/icons';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { formatCrmPhoneInput } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import {
  type MessengerShareChannel,
  buildMessengerShareUrl,
} from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';

import { canShareWorkOrderPdfFile } from '../../workOrders/buildWorkOrderPdfForInstallationSchedule';
import {
  type PackageWorkOrderHubSharePayload,
  buildPackageWorkOrderHubSharePayload,
  buildPackageWorkOrderHubTabPdfFile,
  downloadPackageWorkOrderHubTabPdf,
} from '../../workOrders/packageWorkOrderHubPrint';
import type { PackageWorkOrderHubContextValue } from './PackageWorkOrderHubContext';
import hubStyles from './PackageWorkOrdersHubModal.module.css';
import type { PackageWorkOrderHubTabId } from './packageWorkOrderHubTabs';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: PackageWorkOrderHubTabId;
  hubCtx: PackageWorkOrderHubContextValue;
};

export function PackageWorkOrderShareModal({ isOpen, onClose, panelTab, hubCtx }: Props) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [payloadMeta, setPayloadMeta] = useState<Pick<
    PackageWorkOrderHubSharePayload,
    'documentTitle' | 'installerLabel'
  > | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canNativeSharePdf, setCanNativeSharePdf] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCopied(false);
    setError(null);
    setPdfBusy(false);
    setCanNativeSharePdf(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function'
    );
    try {
      const payload = buildPackageWorkOrderHubSharePayload(panelTab, hubCtx);
      setMessage(payload.message);
      setPhone(payload.installerPhone ? formatCrmPhoneInput(payload.installerPhone) : '');
      setPayloadMeta({
        documentTitle: payload.documentTitle,
        installerLabel: payload.installerLabel,
      });
    } catch (err) {
      setMessage('');
      setPhone('');
      setPayloadMeta(null);
      setError(err instanceof Error ? err.message : 'Не удалось подготовить отправку');
    }
  }, [
    isOpen,
    panelTab,
    hubCtx,
    hubCtx.activeFinalWorkOrderDocId,
    hubCtx.linkedInstallationSchedule,
  ]);

  const openChannel = (channel: MessengerShareChannel) => {
    if (!message) return;
    window.open(buildMessengerShareUrl(channel, message, phone), '_blank', 'noopener,noreferrer');
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
    setPdfBusy(true);
    setError(null);
    try {
      await downloadPackageWorkOrderHubTabPdf(panelTab, hubCtx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  const shareTextAndPdf = async () => {
    if (!message) return;
    setPdfBusy(true);
    setError(null);
    try {
      const { file } = await buildPackageWorkOrderHubTabPdfFile(panelTab, hubCtx);
      if (!canShareWorkOrderPdfFile(file)) {
        await downloadPackageWorkOrderHubTabPdf(panelTab, hubCtx);
        setError(
          'Этот браузер не умеет прикреплять PDF к мессенджеру. PDF скачан — отправьте текст и приложите файл вручную.'
        );
        return;
      }
      await navigator.share({
        title: payloadMeta?.documentTitle || 'Заказ-наряд',
        text: message,
        files: [file],
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Не удалось поделиться PDF');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отправить заказ-наряд"
      size="md"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
      alignTop
    >
      <div className={panelStyles.formShell} data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={hubStyles.shareHintDesktop} style={{ marginTop: 0 }}>
          {payloadMeta?.installerLabel
            ? `Отправляется заказ-наряд мастера «${payloadMeta.installerLabel}» (не общий).`
            : payloadMeta?.documentTitle
              ? `Документ: ${payloadMeta.documentTitle}.`
              : 'Подготовка…'}{' '}
          Скачайте PDF и отправьте вместе с текстом в мессенджер.
        </p>
        <p data-modal-form-hint className={hubStyles.shareHintMobile} style={{ marginTop: 0 }}>
          {payloadMeta?.installerLabel
            ? `З-наряд мастера «${payloadMeta.installerLabel}».`
            : 'Текст + PDF заказ-наряда.'}{' '}
          Удобнее «Поделиться».
        </p>

        <div data-modal-form-group>
          <label htmlFor="wo-share-phone">Телефон монтажника (для WhatsApp)</label>
          <input
            id="wo-share-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatCrmPhoneInput(e.target.value))}
            placeholder="+7(000)-000-00-00"
            autoComplete="tel"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="wo-share-message">Текст сообщения</label>
          <textarea
            id="wo-share-message"
            className={hubStyles.shareMessageTextarea}
            rows={5}
            readOnly
            value={message}
          />
        </div>

        <div data-modal-form-group>
          <label>PDF</label>
          <div className={hubStyles.shareChannelRow}>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={pdfBusy || !message}
              onClick={() => void downloadPdf()}
            >
              {pdfBusy ? 'Готовим PDF…' : 'Скачать PDF'}
            </button>
            {canNativeSharePdf ? (
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={pdfBusy || !message}
                onClick={() => void shareTextAndPdf()}
              >
                Поделиться (текст + PDF)
              </button>
            ) : null}
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div className={hubStyles.shareChannelRow} role="group" aria-label="Мессенджеры">
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
            <span className={hubStyles.shareCopyBtnInner}>
              <CopyIcon tone="inherit" />
              {copied ? 'Скопировано' : 'Копировать'}
            </span>
          </button>
        </div>

        <div data-modal-form-actions className={hubStyles.shareModalActions}>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
