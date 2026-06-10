'use client';

import Link from 'next/link';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

export function ExecutorProfilesPageView({
  draft,
  editingIndex,
  error,
  handleDelete,
  handleUpsert,
  items,
  loading,
  ok,
  resetDraft,
  saving,
  setDraft,
  startEdit,
}: ExecutorProfilesPageModel) {
  return (
    <div className={cdBase.page}>
      <div className={cdHub.editorHeader}>
        <div>
          <h1 className={cdWorkspace.title}>Исполнители</h1>
          <p className={cdWorkspace.subtitle}>
            Создайте наборы реквизитов Исполнителя. Менеджера и офис продаж настройте в разделе{' '}
            <Link className={cdHub.link} href="/admin/contract-documents/signatories">
              Менеджеры
            </Link>
            . В договоре менеджер выберет наборы из списков.
          </p>
        </div>
        <Link className={cdWorkspace.secondaryBtn} href="/admin/contract-documents/contracts">
          К разделу «Ремонт»
        </Link>
      </div>

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

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
            Для счёта на оплату и договора используются эти поля. Старая сводная строка
            пересобирается при сохранении.
          </p>
        </div>
        <div className={cdWorkspace.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
          <button
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

      <div className={cdWorkspace.tableWrap}>
        <table className={cdWorkspace.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Организация</th>
              <th>ИНН</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>Наборы реквизитов пока не добавлены.</td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={`${item.title}-${idx}`}>
                  <td>{item.title}</td>
                  <td>{item.kind === 'ENTREPRENEUR' ? 'ИП' : 'ЮЛ'}</td>
                  <td>{item.companyName || '—'}</td>
                  <td>{item.inn || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className={cdWorkspace.secondaryBtn}
                        onClick={() => startEdit(idx)}
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className={cdWorkspace.dangerBtn}
                        disabled={saving}
                        onClick={() => void handleDelete(idx)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
