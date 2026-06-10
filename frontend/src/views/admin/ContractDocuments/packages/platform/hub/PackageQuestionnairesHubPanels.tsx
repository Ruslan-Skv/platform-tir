'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import type {
  PackageFormData,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from '../form/packageForm';
import { PackageManagerQuestionnaire1Tab } from './PackageManagerQuestionnaire1Tab';
import { PackagePostWorkQuestionnaire2Tab } from './PackagePostWorkQuestionnaire2Tab';
import type { PackageQuestionnaireHubTabId } from './packageQuestionnaireHubTabs';

const Q_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const Q_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact}`;
const Q_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;

export type PackageQuestionnairesHubPanelsProps = {
  panelTab: PackageQuestionnaireHubTabId;
  form: PackageFormData;
  previewHtml: string;
  packageKind?: ContractDocumentPackageKind;
  linkedCrmCustomerId?: string | null;
  onPatchManagerQuestionnaire1: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  onToggleManagerQuestionnaire1Traffic: (id: string) => void;
  onToggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  onToggleManagerQuestionnaire1Need: (id: string) => void;
  onPatchPostWorkQuestionnaire2: (patch: Partial<PackagePostWorkQuestionnaire2Block>) => void;
};

export function PackageQuestionnairesHubPanels({
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
}: PackageQuestionnairesHubPanelsProps) {
  return (
    <div className={`${Q_BLOCK} ${Q_DATA_COMPACT}`}>
      {panelTab === 'questionnaire1' ? (
        <PackageManagerQuestionnaire1Tab
          form={form}
          onPatch={onPatchManagerQuestionnaire1}
          onToggleTrafficSource={onToggleManagerQuestionnaire1Traffic}
          onToggleWhyChosen={onToggleManagerQuestionnaire1WhyChosen}
          onToggleClientNeed={onToggleManagerQuestionnaire1Need}
          syncSourceLabel={linkedCrmCustomerId ? 'crm' : 'unlinked'}
        />
      ) : (
        <PackagePostWorkQuestionnaire2Tab
          form={form}
          packageKind={packageKind}
          onPatch={onPatchPostWorkQuestionnaire2}
        />
      )}
      <div className={Q_A4_WRAP}>
        <article className={cdDocPreview.estimateA4Sheet}>
          <div
            className={`${cdDocPreview.contractA4Preview} ${cdProduct.contractA4Preview}`}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </article>
      </div>
    </div>
  );
}
