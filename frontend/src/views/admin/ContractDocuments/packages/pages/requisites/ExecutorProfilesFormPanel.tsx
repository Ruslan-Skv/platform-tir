'use client';

import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

type ExecutorProfilesFormPanelProps = Pick<
  ExecutorProfilesPageModel,
  'draft' | 'editingIndex' | 'handleUpsert' | 'resetDraft' | 'saving' | 'setDraft'
>;

export function ExecutorProfilesFormPanel({
  draft,
  editingIndex,
  handleUpsert,
  resetDraft,
  saving,
  setDraft,
}: ExecutorProfilesFormPanelProps) {
  return (
    <div className={cdTemplates.sectionCard}>
      <div className={cdTemplates.sectionFields}>
        <div className={cdEstimateTab.field}>
          <label>Название набора</label>
          <input
            value={draft.title ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder='Например: "ООО Территория ИР"'
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Тип исполнителя</label>
          <select
            value={draft.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY'}
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
        <div className={cdEstimateTab.field}>
          <label>Наименование организации</label>
          <input
            value={draft.companyName ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, companyName: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>ИНН</label>
          <input
            value={draft.inn ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, inn: e.target.value }))}
          />
        </div>
        {draft.kind === 'ENTREPRENEUR' ? null : (
          <div className={cdEstimateTab.field}>
            <label>КПП</label>
            <input
              value={draft.kpp ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, kpp: e.target.value }))}
            />
          </div>
        )}
        {draft.kind === 'ENTREPRENEUR' ? (
          <div className={cdEstimateTab.field}>
            <label>ОГРНИП</label>
            <input
              value={draft.ogrnip ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, ogrnip: e.target.value }))}
            />
          </div>
        ) : (
          <div className={cdEstimateTab.field}>
            <label>ОГРН</label>
            <input
              value={draft.ogrn ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, ogrn: e.target.value }))}
            />
          </div>
        )}
        <div className={cdEstimateTab.field}>
          <label>E-mail</label>
          <input
            type="email"
            autoComplete="email"
            value={draft.email ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Юридический адрес</label>
          <textarea
            value={draft.legalAddress ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, legalAddress: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Адрес для корреспонденции</label>
          <textarea
            value={draft.actualAddress ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, actualAddress: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field} style={{ gridColumn: '1 / -1' }}>
          <label>Банк (наименование)</label>
          <input
            value={draft.bankName ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, bankName: e.target.value }))}
            placeholder="Например: АО «Альфа-Банк»"
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>БИК</label>
          <input
            value={draft.bankBik ?? ''}
            onChange={(e) =>
              setDraft((p) => ({ ...p, bankBik: e.target.value.replace(/\D/g, '').slice(0, 9) }))
            }
            placeholder="044030786"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Корр. счёт (к/с)</label>
          <input
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
        <div className={cdEstimateTab.field}>
          <label>Расчётный счёт (р/с)</label>
          <input
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
        </div>
        <p className={cdTemplates.hint} style={{ gridColumn: '1 / -1', margin: 0 }}>
          Для счёта на оплату и договора используются эти поля. Старая сводная строка пересобирается
          при сохранении.
        </p>
      </div>
      <div className={cdWorkspace.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
        <button
          data-admin-mutation
          type="button"
          className={cdWorkspace.primaryBtn}
          disabled={saving}
          onClick={() => void handleUpsert()}
        >
          {editingIndex === null ? 'Добавить набор' : 'Сохранить набор'}
        </button>
        {editingIndex !== null ? (
          <button type="button" className={cdWorkspace.secondaryBtn} onClick={resetDraft}>
            Отменить редактирование
          </button>
        ) : null}
      </div>
    </div>
  );
}
