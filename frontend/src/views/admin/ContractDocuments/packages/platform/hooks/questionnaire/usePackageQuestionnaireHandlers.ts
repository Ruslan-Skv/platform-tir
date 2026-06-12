'use client';

import { useCallback } from 'react';

import type {
  PackageFormData,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from '../../form/packageForm';
import { persistManagerQuestionnaire1ToCrmCustomer } from '../../questionnaires/crmManagerQuestionnaire1';

export type UsePackageQuestionnaireHandlersOptions = {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  formRef: React.MutableRefObject<PackageFormData>;
  touchPackageData: () => void;
  scheduleManagerQuestionnaire1CrmSync: (block: PackageManagerQuestionnaire1Block) => void;
};

export function usePackageQuestionnaireHandlers({
  setForm,
  formRef,
  touchPackageData,
  scheduleManagerQuestionnaire1CrmSync,
}: UsePackageQuestionnaireHandlersOptions) {
  const patchManagerQuestionnaire1 = useCallback(
    (patch: Partial<PackageManagerQuestionnaire1Block>) => {
      setForm((p) => {
        const nextBlock = { ...p.managerQuestionnaire1, ...patch };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, formRef, setForm, touchPackageData]
  );

  const patchPostWorkQuestionnaire2 = useCallback(
    (patch: Partial<PackagePostWorkQuestionnaire2Block>) => {
      setForm((p) => {
        const cur = p.postWorkQuestionnaire2;
        const next: PackagePostWorkQuestionnaire2Block = {
          ...cur,
          ...patch,
          ratingTrades: patch.ratingTrades
            ? { ...cur.ratingTrades, ...patch.ratingTrades }
            : cur.ratingTrades,
        };
        return { ...p, postWorkQuestionnaire2: next };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const toggleManagerQuestionnaire1Need = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.clientNeedsCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const nextBlock = { ...p.managerQuestionnaire1, clientNeedsCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, formRef, setForm, touchPackageData]
  );

  const toggleManagerQuestionnaire1Traffic = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.trafficSourceCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const nextBlock = { ...p.managerQuestionnaire1, trafficSourceCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, formRef, setForm, touchPackageData]
  );

  const toggleManagerQuestionnaire1WhyChosen = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.whyChosenCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const nextBlock = { ...p.managerQuestionnaire1, whyChosenCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, formRef, setForm, touchPackageData]
  );

  return {
    patchManagerQuestionnaire1,
    patchPostWorkQuestionnaire2,
    toggleManagerQuestionnaire1Need,
    toggleManagerQuestionnaire1Traffic,
    toggleManagerQuestionnaire1WhyChosen,
  };
}
