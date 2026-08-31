'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ContractDocumentSigningSessionCreated,
  createPackageSigningSession,
  remoteSigningStatusLabel,
} from '@/shared/api/admin-contract-document-signing';
import { Modal } from '@/shared/ui/Modal';
import { CopyIcon } from '@/shared/ui/icons';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { formatCrmPhoneInput } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';
import type { MessengerShareChannel } from '@/views/admin/CRM/InstallationSchedules/shared/installationScheduleShare';
import hubStyles from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubModal.module.css';
import type { PackageDocumentTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';

import { buildDocumentPdfBlob } from '../../../core/printDocument';
import styles from './PackageCustomerDocumentsShareModal.module.css';
import {
  type PackageCustomerShareContext,
  buildPackageCustomerDocumentHtml,
  buildPackageCustomerShareMailtoUrl,
  defaultSelectedCustomerDocumentTabs,
  loadPackageCustomerShareContext,
  openPackageCustomerMessenger,
} from './packageCustomerDocumentShare';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  packageId: string | null;
  onCreated?: () => void;
};

function buildSigningShareMessage(created: ContractDocumentSigningSessionCreated): string {
  const lines = [
    'Документы на ознакомление и подписание',
    `Ссылка: ${created.signUrl}`,
    `Код подтверждения: ${created.otpCode}`,
  ];
  if (created.customerName) lines.splice(1, 0, `Заказчик: ${created.customerName}`);
  lines.push('Откройте ссылку, просмотрите документы и введите код для подписания.');
  return lines.join('\n');
}

export function PackageRemoteSigningModal({ isOpen, onClose, packageId, onCreated }: Props) {
  const [ctx, setCtx] = useState<PackageCustomerShareContext | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<PackageDocumentTabId[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ContractDocumentSigningSessionCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !packageId) return;
    abortRef.current = false;
    setCreated(null);
    setError(null);
    setBusy(false);
    setLoading(true);
    void loadPackageCustomerShareContext(packageId)
      .then((next) => {
        if (abortRef.current) return;
        setCtx(next);
        setSelectedTabs(defaultSelectedCustomerDocumentTabs(next.shareableDocuments));
        setPhone(next.customerPhone ? formatCrmPhoneInput(next.customerPhone) : '');
        setEmail(next.customerEmail);
        setSendEmail(Boolean(next.customerEmail));
      })
      .catch((err) => {
        if (abortRef.current) return;
        setError(err instanceof Error ? err.message : 'Не удалось загрузить пакет');
        setCtx(null);
      })
      .finally(() => {
        if (!abortRef.current) setLoading(false);
      });
    return () => {
      abortRef.current = true;
    };
  }, [isOpen, packageId]);

  const toggleTab = useCallback((tabId: PackageDocumentTabId) => {
    setSelectedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  }, []);

  const message = useMemo(() => (created ? buildSigningShareMessage(created) : ''), [created]);

  const createSession = async () => {
    if (!ctx || !packageId || selectedTabs.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const docs: Array<{ tabId: string; label: string; file: Blob; fileName: string }> = [];
      for (const tab of selectedTabs) {
        const meta = ctx.shareableDocuments.find((d) => d.tabId === tab);
        if (meta?.isExternalFile) {
          setError(
            `«${meta.label}» — внешний файл. Прикрепите его отдельно или исключите из выбора.`
          );
          setBusy(false);
          return;
        }
        const html = buildPackageCustomerDocumentHtml(ctx, tab).trim();
        if (!html) {
          setError(`Нет данных для документа «${meta?.label ?? tab}»`);
          setBusy(false);
          return;
        }
        const label = meta?.label ?? tab;
        const { blob, fileName } = await buildDocumentPdfBlob(html, label, `${tab}.pdf`, {
          contractCompact: true,
        });
        docs.push({ tabId: tab, label, file: blob, fileName });
      }

      const result = await createPackageSigningSession(packageId, {
        documents: docs,
        customerName: ctx.form.customer.fullName,
        customerPhone: phone,
        customerEmail: email,
        sendEmail: sendEmail && Boolean(email.trim()),
      });
      setCreated(result);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать ссылку');
    } finally {
      setBusy(false);
    }
  };

  const openChannel = (channel: MessengerShareChannel) => {
    if (!message) return;
    openPackageCustomerMessenger(channel, message, phone);
  };

  const openMailto = () => {
    if (!message || !email.trim() || !created) return;
    const url = buildPackageCustomerShareMailtoUrl(
      email,
      'Документы на ознакомление и подписание',
      message
    );
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyAll = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отправить на подписание"
      size="md"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
      alignTop
    >
      <div className={panelStyles.formShell} data-modal-form data-modal-density="compact">
        {!created ? (
          <>
            <p data-modal-form-hint style={{ marginTop: 0 }}>
              Заказчик получит ссылку для просмотра PDF и код подтверждения. После ввода кода
              договор будет отмечен как подписанный.
            </p>
            {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
            {ctx && !loading ? (
              <div data-modal-form-group>
                <div className={styles.docListHeader}>
                  <label>Документы</label>
                  <div className={styles.docListHeaderActions}>
                    <button
                      type="button"
                      className={styles.docListLinkBtn}
                      onClick={() => setSelectedTabs(ctx.shareableDocuments.map((d) => d.tabId))}
                    >
                      Все
                    </button>
                    <button
                      type="button"
                      className={styles.docListLinkBtn}
                      onClick={() => setSelectedTabs([])}
                    >
                      Снять
                    </button>
                  </div>
                </div>
                <div className={styles.docList} role="group" aria-label="Документы">
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
                          disabled={Boolean(doc.isExternalFile)}
                          onChange={() => toggleTab(doc.tabId)}
                        />
                        <span>
                          {doc.label}
                          {doc.isExternalFile ? (
                            <span className={styles.docItemHint}> (файл — пока недоступен)</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div data-modal-form-group>
              <label htmlFor="remote-sign-phone">Телефон заказчика</label>
              <input
                id="remote-sign-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatCrmPhoneInput(e.target.value))}
                placeholder="+7(000)-000-00-00"
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="remote-sign-email">E-mail заказчика</label>
              <input
                id="remote-sign-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className={styles.docItem}>
              <input
                type="checkbox"
                checked={sendEmail}
                disabled={!email.trim()}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              <span>Отправить ссылку и код на e-mail</span>
            </label>

            {error ? <p data-modal-form-error>{error}</p> : null}

            <div data-modal-form-actions>
              <button type="button" data-modal-btn="secondary" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                data-modal-btn="primary"
                disabled={busy || loading || !ctx || selectedTabs.length === 0}
                onClick={() => void createSession()}
              >
                {busy ? 'Готовим PDF и ссылку…' : 'Создать ссылку'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p data-modal-form-hint style={{ marginTop: 0 }}>
              Статус: <strong>{remoteSigningStatusLabel(created.status)}</strong>
              {created.emailSent ? ' · письмо отправлено' : null}
            </p>
            <div data-modal-form-group>
              <label>Ссылка для заказчика</label>
              <input type="text" readOnly value={created.signUrl} />
            </div>
            <div data-modal-form-group>
              <label>Код подтверждения</label>
              <input type="text" readOnly value={created.otpCode} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="remote-sign-msg">Текст для мессенджера</label>
              <textarea
                id="remote-sign-msg"
                className={hubStyles.shareMessageTextarea}
                rows={5}
                readOnly
                value={message}
              />
            </div>
            {error ? <p data-modal-form-error>{error}</p> : null}
            <div className={hubStyles.shareChannelRow} role="group" aria-label="Каналы">
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={() => openChannel('whatsapp')}
              >
                WhatsApp
              </button>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={() => openChannel('telegram')}
              >
                Telegram
              </button>
              <button type="button" data-modal-btn="secondary" onClick={() => openChannel('max')}>
                MAX
              </button>
              <button
                type="button"
                data-modal-btn="secondary"
                disabled={!email.trim()}
                onClick={openMailto}
              >
                Почта
              </button>
              <button type="button" data-modal-btn="secondary" onClick={() => void copyAll()}>
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
          </>
        )}
      </div>
    </Modal>
  );
}
