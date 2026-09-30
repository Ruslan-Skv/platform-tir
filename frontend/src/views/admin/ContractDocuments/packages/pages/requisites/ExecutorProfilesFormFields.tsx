'use client';

import { useRef, useState } from 'react';

import {
  uploadExecutorPaymentQr,
  uploadExecutorRequisitesPdf,
} from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './ExecutorProfilesPage.module.css';
import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

type ExecutorProfilesFormFieldsProps = Pick<
  ExecutorProfilesPageModel,
  'draft' | 'formError' | 'setDraft'
>;

export function ExecutorProfilesFormFields({
  draft,
  formError,
  setDraft,
}: ExecutorProfilesFormFieldsProps) {
  const isEntrepreneur = draft.kind === 'ENTREPRENEUR';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [qrUploadingIndex, setQrUploadingIndex] = useState<number | null>(null);
  const [qrErrorIndex, setQrErrorIndex] = useState<number | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  /** Два фиксированных слота QR-кодов: заполненные сохраняются в draft.paymentQrs. */
  const qrSlots: Array<{ url: string; title: string }> = [0, 1].map((i) => {
    const slot = draft.paymentQrs?.[i];
    return { url: slot?.url ?? '', title: slot?.title ?? '' };
  });

  const updateQrSlot = (index: number, patch: { url?: string; title?: string }) => {
    setDraft((p) => {
      const slots: Array<{ url: string; title: string }> = [0, 1].map((i) => {
        const slot = p.paymentQrs?.[i];
        return { url: slot?.url ?? '', title: slot?.title ?? '' };
      });
      slots[index] = { ...slots[index]!, ...patch };
      return { ...p, paymentQrs: slots.filter((s) => s.url.trim()) };
    });
  };

  const handlePdfSelect = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Можно загрузить только PDF-файл.');
      return;
    }
    setPdfUploading(true);
    setPdfError(null);
    try {
      const { fileUrl, fileName } = await uploadExecutorRequisitesPdf(file);
      setDraft((p) => ({
        ...p,
        requisitesPdfUrl: fileUrl,
        requisitesPdfName: fileName || file.name,
      }));
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Не удалось загрузить PDF');
    } finally {
      setPdfUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQrSelect = async (index: number, file: File | undefined, input: HTMLInputElement) => {
    if (!file) return;
    const okName = /\.(png|jpe?g|webp)$/i.test(file.name);
    const okType = (file.type || '').toLowerCase().startsWith('image/');
    if (!okName && !okType) {
      setQrErrorIndex(index);
      setQrError('Можно загрузить только картинку (PNG, JPG, WebP).');
      input.value = '';
      return;
    }
    setQrUploadingIndex(index);
    setQrErrorIndex(null);
    setQrError(null);
    try {
      const { fileUrl } = await uploadExecutorPaymentQr(file);
      updateQrSlot(index, { url: fileUrl });
    } catch (e) {
      setQrErrorIndex(index);
      setQrError(e instanceof Error ? e.message : 'Не удалось загрузить QR-код');
    } finally {
      setQrUploadingIndex(null);
      input.value = '';
    }
  };

  return (
    <>
      <div data-modal-form-group>
        <label htmlFor="executor_title">Название набора *</label>
        <input
          id="executor_title"
          value={draft.title ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          placeholder='Например: "ООО Территория ИР"'
        />
      </div>

      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="executor_kind">Тип исполнителя</label>
          <select
            id="executor_kind"
            value={isEntrepreneur ? 'ENTREPRENEUR' : 'COMPANY'}
            onChange={(e) => {
              const kind = e.target.value === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
              setDraft((p) =>
                kind === 'ENTREPRENEUR'
                  ? { ...p, kind, kpp: '', ogrn: '' }
                  : { ...p, kind, ogrnip: '' }
              );
            }}
          >
            <option value="COMPANY">Юридическое лицо (ЮЛ)</option>
            <option value="ENTREPRENEUR">Индивидуальный предприниматель (ИП)</option>
          </select>
        </div>
        <div data-modal-form-group>
          <label htmlFor="executor_company">Наименование организации</label>
          <input
            id="executor_company"
            value={draft.companyName ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, companyName: e.target.value }))}
          />
        </div>
      </div>

      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="executor_inn">ИНН</label>
          <input
            id="executor_inn"
            value={draft.inn ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, inn: e.target.value }))}
          />
        </div>
        {isEntrepreneur ? (
          <div data-modal-form-group>
            <label htmlFor="executor_ogrnip">ОГРНИП</label>
            <input
              id="executor_ogrnip"
              value={draft.ogrnip ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, ogrnip: e.target.value }))}
            />
          </div>
        ) : (
          <div data-modal-form-group>
            <label htmlFor="executor_kpp">КПП</label>
            <input
              id="executor_kpp"
              value={draft.kpp ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, kpp: e.target.value }))}
            />
          </div>
        )}
      </div>

      {isEntrepreneur ? null : (
        <div data-modal-form-group>
          <label htmlFor="executor_ogrn">ОГРН</label>
          <input
            id="executor_ogrn"
            value={draft.ogrn ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, ogrn: e.target.value }))}
          />
        </div>
      )}

      <div data-modal-form-group>
        <label htmlFor="executor_email">E-mail</label>
        <input
          id="executor_email"
          type="email"
          autoComplete="email"
          value={draft.email ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="executor_legal_address">Юридический адрес</label>
        <textarea
          id="executor_legal_address"
          value={draft.legalAddress ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, legalAddress: e.target.value }))}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="executor_actual_address">Адрес для корреспонденции</label>
        <textarea
          id="executor_actual_address"
          value={draft.actualAddress ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, actualAddress: e.target.value }))}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="executor_bank_name">Банк (наименование)</label>
        <input
          id="executor_bank_name"
          value={draft.bankName ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, bankName: e.target.value }))}
          placeholder="Например: АО «Альфа-Банк»"
        />
      </div>

      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="executor_bank_bik">БИК</label>
          <input
            id="executor_bank_bik"
            value={draft.bankBik ?? ''}
            onChange={(e) =>
              setDraft((p) => ({ ...p, bankBik: e.target.value.replace(/\D/g, '').slice(0, 9) }))
            }
            placeholder="044030786"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="executor_bank_corr">Корр. счёт (к/с)</label>
          <input
            id="executor_bank_corr"
            value={draft.bankCorrAccount ?? ''}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                bankCorrAccount: e.target.value.replace(/\D/g, '').slice(0, 20),
              }))
            }
            placeholder="30101810200000000786"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </div>

      <div data-modal-form-group>
        <label htmlFor="executor_bank_settlement">Расчётный счёт (р/с)</label>
        <input
          id="executor_bank_settlement"
          value={draft.bankSettlementAccount ?? ''}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              bankSettlementAccount: e.target.value.replace(/\D/g, '').slice(0, 20),
            }))
          }
          placeholder="40802810232160002046"
          inputMode="numeric"
          autoComplete="off"
        />
        <p className={styles.fieldHint}>
          Для счёта на оплату и договора используются эти поля. Старая сводная строка пересобирается
          при сохранении.
        </p>
      </div>

      <div data-modal-form-group>
        <label htmlFor="executor_requisites_pdf">Реквизиты (PDF)</label>
        {draft.requisitesPdfUrl ? (
          <div className={styles.pdfAttachRow}>
            <a
              href={publicUploadUrl(draft.requisitesPdfUrl)}
              target="_blank"
              rel="noreferrer"
              className={styles.pdfAttachLink}
              title={draft.requisitesPdfName || 'Реквизиты.pdf'}
            >
              {draft.requisitesPdfName || 'Реквизиты.pdf'}
            </a>
            <button
              type="button"
              className={styles.pdfAttachRemoveBtn}
              disabled={pdfUploading}
              onClick={() =>
                setDraft((p) => ({ ...p, requisitesPdfUrl: '', requisitesPdfName: '' }))
              }
            >
              Убрать
            </button>
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          id="executor_requisites_pdf"
          type="file"
          accept="application/pdf,.pdf"
          disabled={pdfUploading}
          onChange={(e) => void handlePdfSelect(e.target.files?.[0])}
        />
        <p className={styles.fieldHint}>
          {pdfUploading
            ? 'Загрузка PDF…'
            : 'PDF-файл с реквизитами компании (до 20 МБ). Прикрепляется к карточке и доступен по ссылке из списка.'}
        </p>
        {pdfError ? <p data-modal-form-error>{pdfError}</p> : null}
      </div>

      {qrSlots.map((slot, index) => (
        <div key={index}>
          <div data-modal-form-group>
            <label htmlFor={`executor_payment_qr_title_${index}`}>
              QR-код для оплаты №{index + 1} — заголовок
            </label>
            <input
              id={`executor_payment_qr_title_${index}`}
              value={slot.title}
              maxLength={120}
              onChange={(e) => updateQrSlot(index, { title: e.target.value })}
              placeholder={index === 0 ? 'Например: Оплата по QR-коду' : 'Например: Оплата по СБП'}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor={`executor_payment_qr_file_${index}`}>
              QR-код для оплаты №{index + 1} — картинка
            </label>
            {slot.url ? (
              <div className={styles.pdfAttachRow}>
                <img
                  className={styles.qrPreview}
                  src={publicUploadUrl(slot.url)}
                  alt={`QR-код для оплаты №${index + 1}`}
                />
                <button
                  type="button"
                  className={styles.pdfAttachRemoveBtn}
                  disabled={qrUploadingIndex !== null}
                  onClick={() => updateQrSlot(index, { url: '' })}
                >
                  Убрать
                </button>
              </div>
            ) : null}
            <input
              id={`executor_payment_qr_file_${index}`}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              disabled={qrUploadingIndex !== null}
              onChange={(e) => {
                const input = e.target;
                void handleQrSelect(index, input.files?.[0], input);
              }}
            />
            <p className={styles.fieldHint}>
              {qrUploadingIndex === index
                ? 'Загрузка QR-кода…'
                : 'Картинка с QR-кодом (PNG, JPG, WebP, до 10 МБ). Показывается заказчику на странице подписания с указанным заголовком, если менеджер включит «Отправить ссылку на оплату».'}
            </p>
            {qrError && qrErrorIndex === index ? <p data-modal-form-error>{qrError}</p> : null}
          </div>
        </div>
      ))}

      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}
