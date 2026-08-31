'use client';

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

      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}
