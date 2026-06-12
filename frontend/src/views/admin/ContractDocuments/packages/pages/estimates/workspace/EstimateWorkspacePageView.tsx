'use client';

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
import { normalizeUniqueCategorySlugs } from './estimateWorkspaceUtils';
import type { EstimateWorkspacePageModel } from './hooks/useEstimateWorkspacePage';

export function EstimateWorkspaceLoadingState() {
  return (
    <div className={cdBase.page}>
      <p className={cdBase.hint}>Загрузка…</p>
    </div>
  );
}

type EstimateWorkspacePageViewProps = EstimateWorkspacePageModel;

export function EstimateWorkspacePageView({
  url,
  error,
  setError,
  estimateNameError,
  setEstimateNameError,
  estimateCustomerError,
  estimateObjectAddressError,
  estimateCalculatorError,
  ok,
  customerName,
  objectAddress,
  crmCustomerId,
  exitConfirmOpen,
  setExitConfirmOpen,
  customer,
  session,
  dirtyState,
  save,
}: EstimateWorkspacePageViewProps) {
  return (
    <div className={`${cdBase.page} ${cdBase.pageWide} ${cdWorkspace.estimateWorkspacePage}`}>
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

      {error ? (
        <p className={measurementFormStyles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
      {ok ? <p className={cdDocPreview.success}>{ok}</p> : null}

      <div className={cdWorkspace.estimateWorkspaceTopRow}>
        <div className={cdWorkspace.estimateWorkspaceTopBlock}>
          <EstimateWorkspaceCategoryPicker
            categories={session.estimateCategories}
            selectedSlugs={session.estimateCategorySlugs}
            onToggleCategory={(slug) => {
              session.setEstimateCategorySlugs((prev) => {
                if (prev.includes(slug)) return prev.filter((x) => x !== slug);
                return normalizeUniqueCategorySlugs([...prev, slug]);
              });
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
