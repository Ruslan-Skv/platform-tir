'use client';

import { useEffect, useState } from 'react';

import { type Office, getOffices } from '@/shared/api/admin-crm';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';
import { formatCrmUserLabel } from './signatoriesUtils';

type SignatoriesFormPanelProps = Pick<
  SignatoriesPageModel,
  | 'draft'
  | 'editingIndex'
  | 'handleUpsert'
  | 'managerCrmUsers'
  | 'resetDraft'
  | 'saving'
  | 'setDraft'
>;

export function SignatoriesFormPanel({
  draft,
  editingIndex,
  handleUpsert,
  managerCrmUsers,
  resetDraft,
  saving,
  setDraft,
}: SignatoriesFormPanelProps) {
  const [offices, setOffices] = useState<Office[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await getOffices();
        if (!cancelled) setOffices(list.filter((o) => o.isActive));
      } catch {
        if (!cancelled) setOffices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyOffice = (officeId: string) => {
    const office = offices.find((o) => o.id === officeId);
    setDraft((p) => ({
      ...p,
      officeId,
      salesOffice: office?.name ?? '',
      officePhone: office?.phone ?? '',
    }));
  };

  return (
    <div className={cdTemplates.sectionCard}>
      <div className={cdTemplates.sectionFields}>
        <div className={cdEstimateTab.field}>
          <label>Название карточки</label>
          <input
            value={draft.title ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="Например: «Иванов И.И. — офис X»"
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label htmlFor="signatory_crm_user">Пользователь CRM</label>
          <select
            id="signatory_crm_user"
            value={draft.crmUserId ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, crmUserId: e.target.value }))}
          >
            <option value="">— Выберите сотрудника —</option>
            {managerCrmUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {formatCrmUserLabel(u)}
                {u.employeeCode ? ` · код ${u.employeeCode}` : ''}
              </option>
            ))}
          </select>
          <p className={cdTemplates.hint} style={{ marginTop: 4, marginBottom: 0 }}>
            Обязательная привязка к учётной записи CRM. Код в номере договора задаётся в карточке
            пользователя.
          </p>
        </div>
        <div className={cdEstimateTab.field}>
          <label>Менеджер (именительный падеж)</label>
          <input
            value={draft.directorNameNominative ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, directorNameNominative: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Менеджер (родительный падеж)</label>
          <input
            value={draft.directorNameGenitive ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, directorNameGenitive: e.target.value }))}
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label>Действует на основании</label>
          <input
            value={draft.basis ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, basis: e.target.value }))}
            placeholder="Устава, доверенности № …"
          />
        </div>
        <div className={cdEstimateTab.field}>
          <label htmlFor="signatory_office">Офис продаж</label>
          <select
            id="signatory_office"
            value={draft.officeId ?? ''}
            onChange={(e) => applyOffice(e.target.value)}
          >
            <option value="">— Выберите офис —</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.prefix ? ` (${o.prefix})` : ''}
              </option>
            ))}
          </select>
          <p className={cdTemplates.hint} style={{ marginTop: 4, marginBottom: 0 }}>
            Название и телефон подставляются из справочника офисов. Для номера договора офис берётся
            из открытого рабочего дня.
          </p>
        </div>
        <div className={cdEstimateTab.field}>
          <label>Телефон офиса</label>
          <input
            value={draft.officePhone ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, officePhone: e.target.value }))}
            placeholder="Заполняется из офиса, можно поправить"
          />
        </div>
      </div>
      <div className={cdWorkspace.toolbar} style={{ marginTop: 8, marginBottom: 0 }}>
        <button
          data-admin-mutation
          type="button"
          className={cdWorkspace.primaryBtn}
          disabled={saving}
          onClick={() => void handleUpsert()}
        >
          {editingIndex === null ? 'Добавить карточку' : 'Сохранить карточку'}
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
