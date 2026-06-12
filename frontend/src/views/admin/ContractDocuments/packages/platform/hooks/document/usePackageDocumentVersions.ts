'use client';

import { useCallback, useRef, useState } from 'react';

import {
  type ContractDocumentPackageVersionListItem,
  getContractDocumentPackageVersions,
} from '@/shared/api/admin-contract-document-packages';

export function usePackageDocumentVersions(packageId: string) {
  const [packageVersions, setPackageVersions] = useState<ContractDocumentPackageVersionListItem[]>(
    []
  );
  const [versionsBusy, setVersionsBusy] = useState(false);
  const [isVersionsHistoryOpen, setIsVersionsHistoryOpen] = useState(false);
  const isVersionsHistoryOpenRef = useRef(isVersionsHistoryOpen);
  isVersionsHistoryOpenRef.current = isVersionsHistoryOpen;

  const refreshPackageVersions = useCallback(
    async (opts?: { skipSpinner?: boolean }) => {
      if (!opts?.skipSpinner) setVersionsBusy(true);
      try {
        const list = await getContractDocumentPackageVersions(packageId);
        setPackageVersions(list);
      } catch {
        setPackageVersions([]);
      } finally {
        if (!opts?.skipSpinner) setVersionsBusy(false);
      }
    },
    [packageId]
  );

  const refreshPackageVersionsRef = useRef(refreshPackageVersions);
  refreshPackageVersionsRef.current = refreshPackageVersions;

  return {
    packageVersions,
    setPackageVersions, // used when resetting version list on initial load
    versionsBusy,
    isVersionsHistoryOpen,
    setIsVersionsHistoryOpen,
    isVersionsHistoryOpenRef,
    refreshPackageVersions,
    refreshPackageVersionsRef,
  };
}
