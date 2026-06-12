'use client';

import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { ExecutorProfilesFormPanel } from './ExecutorProfilesFormPanel';
import { ExecutorProfilesPageHeader } from './ExecutorProfilesPageHeader';
import { ExecutorProfilesTable } from './ExecutorProfilesTable';
import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

export function ExecutorProfilesPageView(props: ExecutorProfilesPageModel) {
  const { error, ok } = props;

  return (
    <div className={cdBase.page}>
      <ExecutorProfilesPageHeader />

      {error ? <p className={cdTemplates.error}>{error}</p> : null}
      {ok ? <p className={cdTemplates.hint}>{ok}</p> : null}

      <ExecutorProfilesFormPanel
        draft={props.draft}
        editingIndex={props.editingIndex}
        handleUpsert={props.handleUpsert}
        resetDraft={props.resetDraft}
        saving={props.saving}
        setDraft={props.setDraft}
      />

      <ExecutorProfilesTable
        handleDelete={props.handleDelete}
        items={props.items}
        loading={props.loading}
        saving={props.saving}
        startEdit={props.startEdit}
      />
    </div>
  );
}
