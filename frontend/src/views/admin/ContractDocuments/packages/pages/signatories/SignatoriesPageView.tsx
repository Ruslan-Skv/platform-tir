'use client';

import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { SignatoriesFormPanel } from './SignatoriesFormPanel';
import { SignatoriesPageHeader } from './SignatoriesPageHeader';
import { SignatoriesTable } from './SignatoriesTable';
import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';

export function SignatoriesPageView(props: SignatoriesPageModel) {
  const { error, ok } = props;

  return (
    <div className={cdBase.page}>
      <SignatoriesPageHeader />

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

      <SignatoriesFormPanel
        draft={props.draft}
        editingIndex={props.editingIndex}
        handleUpsert={props.handleUpsert}
        managerCrmUsers={props.managerCrmUsers}
        resetDraft={props.resetDraft}
        saving={props.saving}
        setDraft={props.setDraft}
      />

      <SignatoriesTable
        crmUserLabelById={props.crmUserLabelById}
        displayedRows={props.displayedRows}
        handleDelete={props.handleDelete}
        items={props.items}
        loading={props.loading}
        saving={props.saving}
        setSignatorySort={props.setSignatorySort}
        signatorySort={props.signatorySort}
        startEdit={props.startEdit}
      />
    </div>
  );
}
