'use client';

import type { ContractCustomer, DocumentCustomerBlock } from '@/shared/api/admin-crm';

function disp(v: string | undefined | null): string {
  const s = v != null ? String(v).trim() : '';
  return s === '' ? '—' : s;
}

function typeRu(t: string): string {
  switch (t) {
    case 'COMPANY':
      return 'Юридическое лицо';
    case 'ENTREPRENEUR':
      return 'ИП';
    case 'PERSON':
      return 'Физлицо';
    default:
      return t || '—';
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-modal-field>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function FieldSpan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-modal-field data-modal-span>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function CustomerReadonlyPanel({
  customer,
  formatCurrency,
  formatDateDdMmYyyy,
}: {
  customer: ContractCustomer;
  formatCurrency: (n: number) => string;
  formatDateDdMmYyyy: (iso: string | null) => string;
}) {
  const doc: DocumentCustomerBlock | null | undefined = customer.documentCustomer;
  const isPerson = doc?.type === 'PERSON';

  return (
    <div data-modal-readonly-panel data-modal-density="compact">
      <dl data-modal-detail>
        {doc ? (
          <>
            <Field label="Тип">{typeRu(doc.type)}</Field>
            {isPerson ? (
              <Field label="ФИО">{disp(doc.fullName)}</Field>
            ) : (
              <>
                <Field label="ФИО представителя (именит.)">
                  {disp(doc.representativeFullNameNominative)}
                </Field>
                <Field label="ФИО представителя (родит.)">
                  {disp(doc.representativeFullNameGenitive)}
                </Field>
                <Field label="Наименование организации">{disp(doc.organizationName)}</Field>
                <Field label="Должность представ. (именит.)">
                  {disp(doc.representativePositionNominative)}
                </Field>
                <Field label="Должность представ. (родит.)">
                  {disp(doc.representativePositionGenitive)}
                </Field>
                <Field label="ИНН">{disp(doc.inn)}</Field>
                <Field label="ОГРН">{disp(doc.ogrn)}</Field>
              </>
            )}
            <FieldSpan label="Адрес">{disp(doc.address || customer.customerAddress)}</FieldSpan>
            <Field label="Телефон">{disp(doc.phone || customer.customerPhone)}</Field>
            <Field label="E-mail">{disp(doc.email)}</Field>
            <FieldSpan label="Банковские реквизиты">{disp(doc.bankDetails)}</FieldSpan>
            {isPerson ? (
              <>
                <Field label="Паспорт (серия и номер)">{disp(doc.passportSeriesNumber)}</Field>
                <Field label="Паспорт кем выдан">{disp(doc.passportIssuedBy)}</Field>
                <Field label="Паспорт дата выдачи">{disp(doc.passportIssueDate)}</Field>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Field label="Тип">— (нет сохранённого пакета «Ремонт»)</Field>
            <Field label="Наименование / ФИО (по договору)">{disp(customer.customerName)}</Field>
            <Field label="Телефон (по договору)">{disp(customer.customerPhone)}</Field>
            <FieldSpan label="Адрес (по договору)">{disp(customer.customerAddress)}</FieldSpan>
          </>
        )}

        <Field label="Договоров">{customer.contractCount}</Field>
        <Field label="Сумма по договорам">{formatCurrency(customer.totalAmount)}</Field>
        <FieldSpan label="Договоры">
          {(customer.contracts ?? []).length === 0 ? (
            '—'
          ) : (
            <ul data-modal-contract-links>
              {(customer.contracts ?? []).map((row) => (
                <li key={row.id}>
                  {row.contractNumber ? `№ ${row.contractNumber}` : 'Без номера'}
                  {row.contractDate ? ` от ${formatDateDdMmYyyy(row.contractDate)}` : ''}
                  {` — ${formatCurrency(row.totalAmount)}`}
                </li>
              ))}
            </ul>
          )}
        </FieldSpan>
        <FieldSpan label="Менеджер">
          {customer.manager
            ? [customer.manager.firstName, customer.manager.lastName].filter(Boolean).join(' ') ||
              '—'
            : '—'}
        </FieldSpan>
      </dl>
    </div>
  );
}
