'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWindows from '../../../../styles/windows-package.module.css';
import type {
  RepairManagerQuestionnaire1Block,
  RepairPackageFormData,
  RepairPostWorkQuestionnaire2Block,
} from '../repairPackageForm';
import { RepairManagerQuestionnaire1Tab } from './RepairManagerQuestionnaire1Tab';
import { RepairPostWorkQuestionnaire2Tab } from './RepairPostWorkQuestionnaire2Tab';
import type { RepairQuestionnaireHubTabId } from './repairQuestionnaireHubTabs';

const Q_BLOCK = `${cdDataTab.blockData} ${cdWindows.blockData}`;
const Q_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
const Q_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;

export type RepairContractQuestionnairesPanelsProps = {
  panelTab: RepairQuestionnaireHubTabId;
  form: RepairPackageFormData;
  previewHtml: string;
  packageKind?: ContractDocumentPackageKind;
  linkedCrmCustomerId?: string | null;
  onPatchManagerQuestionnaire1: (patch: Partial<RepairManagerQuestionnaire1Block>) => void;
  onToggleManagerQuestionnaire1Traffic: (id: string) => void;
  onToggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  onToggleManagerQuestionnaire1Need: (id: string) => void;
  onPatchPostWorkQuestionnaire2: (patch: Partial<RepairPostWorkQuestionnaire2Block>) => void;
};

export function RepairContractQuestionnairesPanels({
  panelTab,
  form,
  previewHtml,
  packageKind,
  linkedCrmCustomerId,
  onPatchManagerQuestionnaire1,
  onToggleManagerQuestionnaire1Traffic,
  onToggleManagerQuestionnaire1WhyChosen,
  onToggleManagerQuestionnaire1Need,
  onPatchPostWorkQuestionnaire2,
}: RepairContractQuestionnairesPanelsProps) {
  return (
    <div className={`${Q_BLOCK} ${Q_DATA_COMPACT}`}>
      {panelTab === 'questionnaire1' ? (
        <RepairManagerQuestionnaire1Tab
          form={form}
          onPatch={onPatchManagerQuestionnaire1}
          onToggleTrafficSource={onToggleManagerQuestionnaire1Traffic}
          onToggleWhyChosen={onToggleManagerQuestionnaire1WhyChosen}
          onToggleClientNeed={onToggleManagerQuestionnaire1Need}
          syncSourceLabel={linkedCrmCustomerId ? 'crm' : 'unlinked'}
        />
      ) : (
        <RepairPostWorkQuestionnaire2Tab
          form={form}
          packageKind={packageKind}
          onPatch={onPatchPostWorkQuestionnaire2}
        />
      )}
      <div className={Q_A4_WRAP}>
        <article className={cdDocPreview.estimateA4Sheet}>
          <div
            className={`${cdDocPreview.contractA4Preview} ${cdWindows.contractA4Preview}`}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </article>
      </div>
    </div>
  );
}
