'use client';

import { todayContractDateDdMmYyyy } from '../../../../core/contractDateFormat';
import cdBase from '../../../../styles/base.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import type { PackageFormData } from '../../form/packageForm';
import { isPackageAddendumSlotRemovable } from '../../form/packageForm';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';

export type PackageAddendumTabBarActionsProps = {
  form: PackageFormData;
  activeTab: PackageDocumentTabId;
  addDisabled: boolean;
  addTitle: string;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setActiveTab: (tab: PackageDocumentTabId) => void;
  touchPackageData: () => void;
};

export function PackageAddendumTabBarActions({
  form,
  activeTab,
  addDisabled,
  addTitle,
  setForm,
  setActiveTab,
  touchPackageData,
}: PackageAddendumTabBarActionsProps) {
  return (
    <div
      className={cdChrome.packageTabBarAddendumActions}
      role="group"
      aria-label="Добавить или убрать вкладку доп. соглашения"
    >
      {form.addendumSlotCount < 5 ? (
        <span className={cdChrome.packageAddAddendumTabBtnWrap} title={addTitle}>
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.packageAddAddendumTabBtn} ${cdBase.packageAddAddendumTabBtn}`}
            disabled={addDisabled}
            aria-disabled={addDisabled}
            aria-label={`Добавить вкладку Д/с №${form.addendumSlotCount + 1}`}
            onClick={() => {
              if (addDisabled) return;
              const next = form.addendumSlotCount + 1;
              const newSlotIdx = next - 1;
              setForm((f) => {
                const nextDates = [
                  ...f.addendumDocumentDates,
                ] as PackageFormData['addendumDocumentDates'];
                if (newSlotIdx >= 0 && newSlotIdx < 5 && !nextDates[newSlotIdx]?.trim()) {
                  nextDates[newSlotIdx] = todayContractDateDdMmYyyy();
                }
                return {
                  ...f,
                  addendumSlotCount: next,
                  addendumDocumentDates: nextDates,
                };
              });
              touchPackageData();
              setActiveTab(`addendum${next}` as PackageDocumentTabId);
            }}
          >
            + Д/с №{form.addendumSlotCount + 1}
          </button>
        </span>
      ) : null}
      {form.addendumSlotCount > 0 ? (
        <span
          className={cdChrome.packageAddAddendumTabBtnWrap}
          title={
            isPackageAddendumSlotRemovable(form.addendumSlots[form.addendumSlotCount - 1])
              ? `Удалить пустое Д/с №${form.addendumSlotCount}`
              : `Можно удалить только пустое Д/с №${form.addendumSlotCount}`
          }
        >
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.packageAddAddendumTabBtn} ${cdBase.packageAddAddendumTabBtn}`}
            disabled={
              !isPackageAddendumSlotRemovable(form.addendumSlots[form.addendumSlotCount - 1])
            }
            aria-label={`Убрать вкладку Д/с №${form.addendumSlotCount}`}
            onClick={() => {
              const lastIdx = form.addendumSlotCount - 1;
              if (!isPackageAddendumSlotRemovable(form.addendumSlots[lastIdx])) {
                return;
              }
              const nextCount = form.addendumSlotCount - 1;
              setForm((f) => {
                const nextDates = [
                  ...f.addendumDocumentDates,
                ] as PackageFormData['addendumDocumentDates'];
                nextDates[lastIdx] = '';
                const nextSlots = [...f.addendumSlots] as PackageFormData['addendumSlots'];
                nextSlots[lastIdx] = {
                  status: 'OPEN',
                  signedAt: '',
                  paidAt: '',
                  workPeriodIncreaseDays: '',
                  selectedPresetIds: [],
                  snapshot: null,
                  excludedSelectedPresetIds: [],
                  excludedSnapshot: null,
                  notes: '',
                  excludedNotes: '',
                  specificationAddedLines: [],
                  specificationExcludedLines: [],
                };
                return {
                  ...f,
                  addendumSlotCount: nextCount,
                  addendumDocumentDates: nextDates,
                  addendumSlots: nextSlots,
                };
              });
              touchPackageData();
              const removedTabs = new Set<string>([
                `addendum${form.addendumSlotCount}`,
                `workOrderAddendum${form.addendumSlotCount}`,
              ]);
              if (removedTabs.has(activeTab)) {
                setActiveTab(
                  nextCount > 0 ? (`addendum${nextCount}` as PackageDocumentTabId) : 'contract'
                );
              }
            }}
          >
            − Д/с №{form.addendumSlotCount}
          </button>
        </span>
      ) : null}
    </div>
  );
}
