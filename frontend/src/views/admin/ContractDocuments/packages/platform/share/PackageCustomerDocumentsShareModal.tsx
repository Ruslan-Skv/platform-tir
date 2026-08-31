'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import { CopyIcon } from '@/shared/ui/icons';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { formatCrmPhoneInput } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import type { MessengerShareChannel } from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';
import hubStyles from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubModal.module.css';
import type { PackageDocumentTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';

import styles from './PackageCustomerDocumentsShareModal.module.css';
import {
  type PackageCustomerShareContext,
  buildPackageCustomerShareContextFromEditor,
  buildPackageCustomerShareMailtoUrl,
  buildPackageCustomerShareMessage,
  defaultSelectedCustomerDocumentTabs,
  downloadPackageCustomerSharePdf,
  loadPackageCustomerShareContext,
  openPackageCustomerMessenger,
  sharePackageCustomerDocumentsNative,
} from './packageCustomerDocumentShare';

export type PackageCustomerDocumentsShareLiveInput = Parameters<
  typeof buildPackageCustomerShareContextFromEditor
>[0];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  packageId: string | null;
  /** Если передан — берём актуальные данные редактора на момент открытия. */
  liveInput?: PackageCustomerDocumentsShareLiveInput | null;
};

export function PackageCustomerDocumentsShareModal({
  isOpen,
  onClose,
  packageId,
  liveInput = null,
}: Props) {
  const liveInputRef = useRef(liveInput);
  liveInputRef.current = liveInput;

  const [ctx, setCtx] = useState<PackageCustomerShareContext | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<PackageDocumentTabId[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!isOpen || !packageId) return;
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
    if (live && live.packageId === packageId) {
      const next = buildPackageCustomerShareContextFromEditor(live);
      setCtx(next);
      setSelectedTabs(defaultSelectedCustomerDocumentTabs(next.shareableDocuments));
      setPhone(next.customerPhone ? formatCrmPhoneInput(next.customerPhone) : '');
      setEmail(next.customerEmail);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCtx(null);
    void loadPackageCustomerShareContext(packageId)
      .then((next) => {
        if (cancelled) return;
        setCtx(next);
        setSelectedTabs(defaultSelectedCustomerDocumentTabs(next.shareableDocuments));
        setPhone(next.customerPhone ? formatCrmPhoneInput(next.customerPhone) : '');
        setEmail(next.customerEmail);
      })
      .catch((err) => {
        if (cancelled) return;
        setCtx(null);
        setSelectedTabs([]);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить документы');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, packageId]);

  const message = useMemo(
    () => (ctx ? buildPackageCustomerShareMessage(ctx, selectedTabs) : ''),
    [ctx, selectedTabs]
  );

  const toggleTab = useCallback((tabId: PackageDocumentTabId) => {
    setSelectedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (!ctx) return;
    setSelectedTabs(ctx.shareableDocuments.map((d) => d.tabId));
  }, [ctx]);

  const clearAll = useCallback(() => {
    setSelectedTabs([]);
  }, []);

  const openChannel = (channel: MessengerShareChannel) => {
    if (!message || selectedTabs.length === 0) return;
    openPackageCustomerMessenger(channel, message, phone);
  };

  const openEmail = () => {
    if (!message || !email.trim()) return;
    const subject = ctx
      ? `Документы по договору № ${ctx.contractNumberLabel}`
      : 'Документы по договору';
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
    if (!ctx || selectedTabs.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { skippedLabels } = await downloadPackageCustomerSharePdf(ctx, selectedTabs);
      if (skippedLabels.length) {
        setError(`Часть документов пропущена (нет данных): ${skippedLabels.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сформировать PDF');
    } finally {
      setBusy(false);
    }
  };

  const shareNative = async () => {
    if (!ctx || !message || selectedTabs.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sharePackageCustomerDocumentsNative(ctx, selectedTabs, message);
      if (result.usedDownloadFallback) {
        setError(
          'Этот браузер не умеет прикреплять файлы к мессенджеру. Файлы скачаны — отправьте текст и приложите вручную.'
        );
      } else if (result.skippedLabels.length) {
        setError(`Часть документов пропущена (нет данных): ${result.skippedLabels.join(', ')}`);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Не удалось поделиться файлами');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError(null);
    onClose();
  };

  const hasSelection = selectedTabs.length > 0;
  const contractLabel = ctx?.contractNumberLabel?.trim() || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        contractLabel ? `Отправить заказчику (договор № ${contractLabel})` : 'Отправить заказчику'
      }
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
        <p data-modal-form-hint className={hubStyles.shareHintDesktop} style={{ marginTop: 0 }}>
          Отметьте документы галочками, скачайте PDF и отправьте вместе с текстом в мессенджер или
          на почту. На телефоне удобнее «Поделиться».
        </p>
        <p data-modal-form-hint className={hubStyles.shareHintMobile} style={{ marginTop: 0 }}>
          Выберите документы → «Поделиться» или мессенджер / почта.
        </p>

        {loading ? <p data-modal-form-hint>Загрузка документов…</p> : null}

        {ctx && !loading ? (
          <div data-modal-form-group>
            <div className={styles.docListHeader}>
              <label>Документы к отправке</label>
              <div className={styles.docListHeaderActions}>
                <button type="button" className={styles.docListLinkBtn} onClick={selectAll}>
                  Все
                </button>
                <button type="button" className={styles.docListLinkBtn} onClick={clearAll}>
                  Снять
                </button>
              </div>
            </div>
            <div className={styles.docList} role="group" aria-label="Документы к отправке">
              {ctx.shareableDocuments.map((doc) => {
                const checked = selectedTabs.includes(doc.tabId);
                return (
                  <label
                    key={doc.tabId}
                    className={`${styles.docItem}${checked ? ` ${styles.docItemSelected}` : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTab(doc.tabId)}
                    />
                    <span>
                      {doc.label}
                      {doc.isExternalFile ? (
                        <span className={styles.docItemHint}> (файл)</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div data-modal-form-group>
          <label htmlFor="customer-share-phone">Телефон заказчика (для WhatsApp)</label>
          <input
            id="customer-share-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatCrmPhoneInput(e.target.value))}
            placeholder="+7(000)-000-00-00"
            autoComplete="tel"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="customer-share-email">E-mail заказчика</label>
          <input
            id="customer-share-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            autoComplete="email"
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="customer-share-message">Текст сообщения</label>
          <textarea
            id="customer-share-message"
            className={hubStyles.shareMessageTextarea}
            rows={5}
            readOnly
            value={message}
          />
        </div>

        <div data-modal-form-group>
          <label>Файлы</label>
          <div className={hubStyles.shareChannelRow}>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={busy || loading || !hasSelection || !ctx}
              onClick={() => void downloadPdf()}
            >
              {busy ? 'Готовим…' : 'Скачать PDF'}
            </button>
            {canNativeShare ? (
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={busy || loading || !hasSelection || !ctx}
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
            disabled={!hasSelection || !message}
            onClick={() => openChannel('whatsapp')}
          >
            WhatsApp
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!hasSelection || !message}
            onClick={() => openChannel('telegram')}
          >
            Telegram
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!hasSelection || !message}
            onClick={() => openChannel('max')}
          >
            MAX
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!hasSelection || !message || !email.trim()}
            onClick={openEmail}
            title={email.trim() ? 'Открыть письмо в почтовом клиенте' : 'Укажите e-mail заказчика'}
          >
            Почта
          </button>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={!hasSelection || !message}
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
