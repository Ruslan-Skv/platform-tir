'use client';

import { Suspense } from 'react';

import cdBase from '../../../styles/base.module.css';
import {
  EstimateWorkspaceLoadingState,
  EstimateWorkspacePageView,
} from './workspace/EstimateWorkspacePageView';
import { useEstimateWorkspacePage } from './workspace/hooks/useEstimateWorkspacePage';

function ContractDocumentsEstimateWorkspaceInner() {
  const page = useEstimateWorkspacePage();

  if (page.session.loading) {
    return <EstimateWorkspaceLoadingState />;
  }

  return <EstimateWorkspacePageView {...page} />;
}

export function ContractDocumentsEstimateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className={cdBase.page}>
          <p className={cdBase.hint}>Загрузка…</p>
        </div>
      }
    >
      <ContractDocumentsEstimateWorkspaceInner />
    </Suspense>
  );
}
