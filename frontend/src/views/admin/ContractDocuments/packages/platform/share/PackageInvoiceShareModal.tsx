'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import { CopyIcon } from '@/shared/ui/icons';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { formatCrmPhoneInput } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import type { MessengerShareChannel } from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';
import type { PackageDocumentTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import type { PackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import hubStyles from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubModal.module.css';

import {
  buildPackageCustomerShareMailtoUrl,
  openPackageCustomerMessenger,
} from './packageCustomerDocumentShare';
import {
  type PackageInvoiceShareContext,
  buildPackageInvoiceShareContextFromLive,
  buildPackageInvoiceShareMessage,
  downloadPackageInvoiceSharePdf,
  loadPackageInvoiceShareContext,
  sharePackageInvoiceNative,
} from './packageInvoiceShare';

export type PackageInvoiceShareLiveInput = {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  invoice: ContractDocumentPaymentInvoice | null;
  /** Если передан — без повторной загрузки пакета (модалка счетов договора). */
  liveInput?: PackageInvoiceShareLiveInput | null;
};

export function PackageInvoiceShareModal({ isOpen, onClose, invoice, liveInput = null }: Props) {
  const liveInputRef = useRef(liveInput);
  liveInputRef.current = liveInput;

  const [ctx, setCtx] = useState<PackageInvoiceShareContext | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) return;
    let cancelled = false;
    setCopied(false);
    setError(null);
    setBusy(false);
    setCanNativeShare(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function'
    );

    const live = liveInputRef.current;
    if (live && live.packageId === invoice.packageId) {
      const next = buildPackageInvoiceShareContextFromLive({
        ...live,
        invoice,
      });
      setCtx(next);
      setPhone(next.customerPhone ? formatCrmPhoneInput(next.customerPhone) : '');
      setEmail(next.customerEmail);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCtx(null);
    void loadPackageInvoiceShareContext(invoice)
      .then((next) => {
        if (cancelled) return;
        setCtx(next);
        setPhone(next.customerPhone ? formatCrmPhoneInput(next.customerPhone) : '');
        setEmail(next.customerEmail);
      })
      .catch((err) => {
        if (cancelled) return;
        setCtx(null);
        setError(err instanceof Error ? err.message : 'Не удалось подготовить счёт');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, invoice]);

  const message = useMemo(() => (ctx ? buildPackageInvoiceShareMessage(ctx) : ''), [ctx]);

  const openChannel = (channel: MessengerShareChannel) => {
    if (!message) return;
    openPackageCustomerMessenger(channel, message, phone);
  };

  const openEmail = () => {
    if (!message || !email.trim() || !ctx) return;
    const subject = `Счёт № ${ctx.invoice.invoiceNumber} к договору № ${ctx.contractNumberLabel}`;
    const url = buildPackageCustomerShareMailtoUrl(email, subject, message);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
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
    if (!ctx) return;
    setBusy(true);
    setError(null);
    try {
      await downloadPackageInvoiceSharePdf(ctx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать PDF');
    } finally {
      setBusy(false);
    }
  };

  const shareNative = async () => {
    if (!ctx || !message) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sharePackageInvoiceNative(ctx, message);
      if (result.usedDownloadFallback) {
        setError(
          'Этот браузер не умеет прикреплять PDF к мессенджеру. PDF скачан — отправьте текст и приложите файл вручную.'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Не удалось поделиться PDF');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError(null);
    onClose();
  };

  const titleInvoice = invoice?.invoiceNumber?.trim()
    ? `Отправить счёт № ${invoice.invoiceNumber}`
    : 'Отправить счёт заказчику';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={titleInvoice}
      size="md"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
      alignTop
    >
      <div className={panelStyles.formShell} data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={hubStyles.shareHintDesktop} style={{ marginTop: 0 }}>
          Скачайте PDF счёта и отправьте вместе с текстом в мессенджер или на почту. На телефоне
          удобнее «Поделиться».
        </p>
        <p data-modal-form-hint className={hubStyles.shareHintMobile} style={{ marginTop: 0 }}>
          PDF счёта + текст. Удобнее «Поделиться».
        </p>

        {loading ? <p data-modal-form-hint>Подготовка…</p> : null}

        <div data-modal-form-group>
          <label htmlFor="invoice-share-phone">Телефон заказчика (для WhatsApp)</label>
          <input
            id="invoice-share-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatCrmPhoneInput(e.target.value))}
            placeholder="+7(000)-000-00-00"
            autoComplete="tel"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="invoice-share-email">E-mail заказчика</label>
          <input
            id="invoice-share-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            autoComplete="email"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="invoice-share-message">Текст сообщения</label>
          <textarea
            id="invoice-share-message"
            className={hubStyles.shareMessageTextarea}
            rows={5}
            readOnly
            value={message}
          />
        </div>

        <div data-modal-form-group>
          <label>PDF счёта</label>
          <div className={hubStyles.shareChannelRow}>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={busy || loading || !ctx}
              onClick={() => void downloadPdf()}
            >
              {busy ? 'Готовим PDF…' : 'Скачать PDF'}
            </button>
            {canNativeShare ? (
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={busy || loading || !ctx}
                onClick={() => void shareNative()}
              >
                Поделиться
              </button>
            ) : null}
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div className={hubStyles.shareChannelRow} role="group" aria-label="Каналы отправки">
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!message}
            onClick={() => openChannel('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!message}
            onClick={() => openChannel('telegram')}
          >
            Telegram
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!message}
            onClick={() => openChannel('max')}
          >
            MAX
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!message || !email.trim()}
            onClick={openEmail}
            title={email.trim() ? 'Открыть письмо в почтовом клиенте' : 'Укажите e-mail заказчика'}
          >
            Почта
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!message}
            onClick={() => void copyMessage()}
          >
            <span className={hubStyles.shareCopyBtnInner}>
              <CopyIcon tone="inherit" />
              {copied ? 'Скопировано' : 'Копировать'}
            </span>
          </button>
        </div>

        <div data-modal-form-actions className={hubStyles.shareModalActions}>
          <button type="button" data-modal-btn="secondary" onClick={handleClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
