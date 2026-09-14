import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useEstimateWorkspaceActiveCategory } from './useEstimateWorkspaceActiveCategory';
import { useEstimateWorkspaceCustomer } from './useEstimateWorkspaceCustomer';
import { useEstimateWorkspaceDirtyState } from './useEstimateWorkspaceDirtyState';
import { useEstimateWorkspaceLoad } from './useEstimateWorkspaceLoad';
import { useEstimateWorkspaceSave } from './useEstimateWorkspaceSave';
import { useEstimateWorkspaceTotalCost } from './useEstimateWorkspaceTotalCost';

export function useEstimateWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estimateIdFromUrl = searchParams.get('id');
  const copyFromId = searchParams.get('copyFrom');
  const splitInstanceFromUrl = searchParams.get('splitInstance') === '1';
  const newSplitBundleFromUrl = searchParams.get('newSplitBundle') === '1';
  const joinSplitBundleIdFromUrl = searchParams.get('splitBundle')?.trim() ?? '';
  const fromMeasurementId = searchParams.get('fromMeasurement');

  const [error, setError] = useState<string | null>(null);
  const [estimateNameError, setEstimateNameError] = useState<string | null>(null);
  const [estimateCustomerError, setEstimateCustomerError] = useState<string | null>(null);
  const [estimateObjectAddressError, setEstimateObjectAddressError] = useState<string | null>(null);
  const [estimateCalculatorError, setEstimateCalculatorError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [crmCustomerId, setCrmCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  // Тост сообщения о сохранении/ошибке скрывается сам — как на странице замера.
  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(null), 3500);
    return () => window.clearTimeout(t);
  }, [ok]);

  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  const customer = useEstimateWorkspaceCustomer({
    setCrmCustomerId,
    setCustomerName,
    setObjectAddress,
    setEstimateCustomerError,
    setEstimateObjectAddressError,
  });

  const session = useEstimateWorkspaceLoad({
    estimateIdFromUrl,
    copyFromId,
    splitInstanceFromUrl,
    fromMeasurementId,
    applyCustomerFromLoader: customer.applyCustomerFromLoader,
    resetCustomerLoadGuard: customer.resetCustomerLoadGuard,
    setError,
    setOk,
  });

  const dirtyState = useEstimateWorkspaceDirtyState({
    copySessionPendingSave: session.copySessionPendingSave,
    baseline: session.baseline,
    estimateCategorySlugs: session.estimateCategorySlugs,
    estimateNameDraft: session.estimateNameDraft,
    crmCustomerId,
    customerName,
    objectAddress,
    additionalMarkupRaw: session.additionalMarkupRaw,
    estimateCalculatorError,
    setEstimateCalculatorError,
  });

  const estimateTotalCost = useEstimateWorkspaceTotalCost(session.estimateCategorySlugs);

  useEstimateWorkspaceActiveCategory(
    session.estimateCategorySlugs,
    session.activeCategorySlug,
    session.setActiveCategorySlug
  );

  const save = useEstimateWorkspaceSave({
    router,
    baseline: session.baseline,
    items: session.items,
    setItems: session.setItems,
    estimateGroups: session.estimateGroups,
    setEstimateGroups: session.setEstimateGroups,
    estimateCategories: session.estimateCategories,
    estimateCategorySlugs: session.estimateCategorySlugs,
    estimateNameDraft: session.estimateNameDraft,
    additionalMarkupRaw: session.additionalMarkupRaw,
    selectedEstimateId: session.selectedEstimateId,
    setSelectedEstimateId: session.setSelectedEstimateId,
    crmCustomerId,
    customerName,
    objectAddress,
    copyFromId,
    splitInstanceFromUrl,
    newSplitBundleFromUrl,
    joinSplitBundleIdFromUrl,
    fromMeasurementId,
    setCopySessionPendingSave: session.setCopySessionPendingSave,
    setBaseline: session.setBaseline,
    setError,
    setOk,
    setEstimateNameError,
    setEstimateCustomerError,
    setEstimateObjectAddressError,
    setEstimateCalculatorError,
    setExitConfirmOpen,
  });

  return {
    url: {
      estimateIdFromUrl,
      copyFromId,
      splitInstanceFromUrl,
      newSplitBundleFromUrl,
      joinSplitBundleIdFromUrl,
      fromMeasurementId,
    },
    error,
    setError,
    estimateNameError,
    setEstimateNameError,
    estimateCustomerError,
    estimateObjectAddressError,
    estimateCalculatorError,
    ok,
    setOk,
    crmCustomerId,
    customerName,
    objectAddress,
    exitConfirmOpen,
    setExitConfirmOpen,
    customer,
    session,
    dirtyState,
    save,
    estimateTotalCost,
  };
}

export type EstimateWorkspacePageModel = ReturnType<typeof useEstimateWorkspacePage>;
