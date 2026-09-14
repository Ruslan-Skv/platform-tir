'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { EstimateWorkspaceCalculatorPane } from './EstimateWorkspaceCalculatorPane';
import { EstimateWorkspaceCategoryPicker } from './EstimateWorkspaceCategoryPicker';
import { EstimateWorkspaceCustomerCard } from './EstimateWorkspaceCustomerCard';
import { EstimateWorkspaceExitModal } from './EstimateWorkspaceExitModal';
import { EstimateWorkspacePageHeader } from './EstimateWorkspacePageHeader';
import { syncRoomsForCategorySwitch } from './estimateWorkspaceCategorySwitch';
import { uniqueCategorySlugsInOrder } from './estimateWorkspaceUtils';
import type { EstimateWorkspacePageModel } from './hooks/useEstimateWorkspacePage';

export function EstimateWorkspaceLoadingState() {
  return (
    <div className={cdBase.page}>
      <p className={cdDocPreview.hint}>Загрузка…</p>
    </div>
  );
}

type EstimateWorkspacePageViewProps = EstimateWorkspacePageModel;

type WorkspaceToastMessage = { type: 'success' | 'error'; text: string };

/** Тост в правом нижнем углу — как сообщение о сохранении на странице замера. */
function EstimateWorkspaceToast({
  message,
  onClose,
}: {
  message: WorkspaceToastMessage;
  onClose: () => void;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Внутрь admin shell — есть CSS-переменные; body их не наследует (тост становился невидимым).
    setPortalRoot(document.querySelector<HTMLElement>('[data-admin-shell]') ?? document.body);
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <div
      className={`${measurementFormStyles.toast} ${
        message.type === 'success'
          ? measurementFormStyles.toastSuccess
          : measurementFormStyles.toastError
      }`}
      role={message.type === 'success' ? 'status' : 'alert'}
    >
      <span className={measurementFormStyles.toastIcon} aria-hidden>
        {message.type === 'success' ? '✓' : '⚠'}
      </span>
      <span className={measurementFormStyles.toastMessage}>{message.text}</span>
      <button
        type="button"
        className={measurementFormStyles.toastClose}
        onClick={onClose}
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>,
    portalRoot
  );
}

export function EstimateWorkspacePageView({
  url,
  error,
  setError,
  ok,
  setOk,
  estimateNameError,
  setEstimateNameError,
  estimateCustomerError,
  estimateObjectAddressError,
  estimateCalculatorError,
  customerName,
  objectAddress,
  crmCustomerId,
  exitConfirmOpen,
  setExitConfirmOpen,
  customer,
  session,
  dirtyState,
  save,
  estimateTotalCost,
}: EstimateWorkspacePageViewProps) {
  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdWorkspace.estimateWorkspacePage}`}>
      <EstimateWorkspacePageHeader
        estimateIdFromUrl={url.estimateIdFromUrl}
        copyFromId={url.copyFromId}
        splitInstanceFromUrl={url.splitInstanceFromUrl}
        newSplitBundleFromUrl={url.newSplitBundleFromUrl}
        joinSplitBundleIdFromUrl={url.joinSplitBundleIdFromUrl}
        fromMeasurementId={url.fromMeasurementId}
        isEditingExisting={save.isEditingExisting}
        dirty={dirtyState.dirty}
        saving={save.saving}
        onSave={() => void save.saveCurrentEstimate()}
        onRequestExit={() => setExitConfirmOpen(true)}
      />

      {error || ok ? (
        <EstimateWorkspaceToast
          message={error ? { type: 'error', text: error } : { type: 'success', text: ok ?? '' }}
          onClose={() => {
            setError(null);
            setOk(null);
          }}
        />
      ) : null}

      <div className={cdWorkspace.estimateWorkspaceTopRow}>
        <div className={cdWorkspace.estimateWorkspaceTopBlock}>
          <EstimateWorkspaceCategoryPicker
            categories={session.estimateCategories}
            selectedSlugs={session.estimateCategorySlugs}
            onToggleCategory={(slug) => {
              const alreadySelected = session.estimateCategorySlugs.includes(slug);
              if (alreadySelected) {
                session.setEstimateCategorySlugs((prev) => prev.filter((x) => x !== slug));
                return;
              }
              window.dispatchEvent(new Event('estimate-calculator-flush-draft'));
              const nextSlugs = uniqueCategorySlugsInOrder([
                slug,
                ...session.estimateCategorySlugs,
              ]);
              syncRoomsForCategorySwitch(session.activeCategorySlug, slug, nextSlugs);
              session.setEstimateCategorySlugs(nextSlugs);
              session.setActiveCategorySlug(slug);
            }}
          />
        </div>
        <div className={cdWorkspace.estimateWorkspaceTopBlock}>
          <EstimateWorkspaceCustomerCard
            estimateNameDraft={session.estimateNameDraft}
            onEstimateNameChange={(value) => {
              session.setEstimateNameDraft(value);
              if (estimateNameError) {
                setEstimateNameError(null);
                setError(null);
              }
            }}
            estimateNameError={estimateNameError}
            additionalMarkupRaw={session.additionalMarkupRaw}
            onAdditionalMarkupChange={session.setAdditionalMarkupRaw}
            estimateTotalCost={estimateTotalCost}
            customerName={customerName}
            objectAddress={objectAddress}
            estimateCustomerError={estimateCustomerError}
            estimateObjectAddressError={estimateObjectAddressError}
            crmCustomerId={crmCustomerId}
            onCustomerApplied={customer.handleEstimateCrmCustomerApplied}
            onCustomerClear={customer.handleEstimateCrmCustomerClear}
            onCrmError={(text) => setError(text)}
          />
        </div>
      </div>

      <EstimateWorkspaceCalculatorPane
        estimateCalculatorError={estimateCalculatorError}
        categorySlugs={session.estimateCategorySlugs}
        categories={session.estimateCategories}
        activeCategorySlug={session.activeCategorySlug}
        onActiveCategoryChange={(slug) => {
          window.dispatchEvent(new Event('estimate-calculator-flush-draft'));
          syncRoomsForCategorySwitch(
            session.activeCategorySlug,
            slug,
            session.estimateCategorySlugs
          );
          session.setActiveCategorySlug(slug);
        }}
      />

      <EstimateWorkspaceExitModal
        isOpen={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        onConfirm={save.abandonChangesAndLeave}
      />
    </div>
  );
}
