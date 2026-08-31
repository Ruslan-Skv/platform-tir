'use client';

import { useEffect, useState } from 'react';

import { type Office, getOffices } from '@/shared/api/admin-crm';

import styles from './SignatoriesPage.module.css';
import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';
import { formatCrmUserLabel } from './signatoriesUtils';

type SignatoriesFormFieldsProps = Pick<
  SignatoriesPageModel,
  'crmUsers' | 'draft' | 'formError' | 'setDraft'
>;

export function SignatoriesFormFields({
  crmUsers,
  draft,
  formError,
  setDraft,
}: SignatoriesFormFieldsProps) {
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
    <>
      <div data-modal-form-group>
        <label htmlFor="signatory_title">Название карточки *</label>
        <input
          id="signatory_title"
          value={draft.title ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          placeholder="Например: «Иванов И.И. — офис X»"
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="signatory_crm_user">Пользователь CRM *</label>
        <select
          id="signatory_crm_user"
          value={draft.crmUserId ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, crmUserId: e.target.value }))}
        >
          <option value="">— Выберите сотрудника —</option>
          {crmUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {formatCrmUserLabel(u)}
              {u.employeeCode ? ` · код ${u.employeeCode}` : ''}
            </option>
          ))}
        </select>
        <p className={styles.fieldHint}>
          Обязательная привязка к учётной записи. Код в номере договора задаётся в карточке
          пользователя.
        </p>
      </div>

      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="signatory_name_nom">Менеджер (именительный)</label>
          <input
            id="signatory_name_nom"
            value={draft.directorNameNominative ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, directorNameNominative: e.target.value }))}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="signatory_name_gen">Менеджер (родительный)</label>
          <input
            id="signatory_name_gen"
            value={draft.directorNameGenitive ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, directorNameGenitive: e.target.value }))}
          />
        </div>
      </div>

      <div data-modal-form-group>
        <label htmlFor="signatory_basis">Действует на основании</label>
        <input
          id="signatory_basis"
          value={draft.basis ?? ''}
          onChange={(e) => setDraft((p) => ({ ...p, basis: e.target.value }))}
          placeholder="Устава, доверенности № …"
        />
      </div>

      <div data-modal-form-grid>
        <div data-modal-form-group>
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
          <p className={styles.fieldHint}>
            Название и телефон подставляются из справочника. Для номера договора офис берётся из
            открытого рабочего дня.
          </p>
        </div>
        <div data-modal-form-group>
          <label htmlFor="signatory_office_phone">Телефон офиса</label>
          <input
            id="signatory_office_phone"
            value={draft.officePhone ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, officePhone: e.target.value }))}
            placeholder="Заполняется из офиса, можно поправить"
          />
        </div>
      </div>

      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}
