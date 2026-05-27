'use client';

import styles from '../ContractDocuments.module.css';
import { RepairManagerQuestionnaire1Tab } from './RepairManagerQuestionnaire1Tab';
import { RepairPostWorkQuestionnaire2Tab } from './RepairPostWorkQuestionnaire2Tab';
import type {
  RepairManagerQuestionnaire1Block,
  RepairPackageFormData,
  RepairPostWorkQuestionnaire2Block,
} from './repairPackageForm';
import type { RepairQuestionnaireHubTabId } from './repairQuestionnaireHubTabs';

export type RepairContractQuestionnairesPanelsProps = {
  panelTab: RepairQuestionnaireHubTabId;
  form: RepairPackageFormData;
  previewHtml: string;
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
  linkedCrmCustomerId,
  onPatchManagerQuestionnaire1,
  onToggleManagerQuestionnaire1Traffic,
  onToggleManagerQuestionnaire1WhyChosen,
  onToggleManagerQuestionnaire1Need,
  onPatchPostWorkQuestionnaire2,
}: RepairContractQuestionnairesPanelsProps) {
  return (
    <div className={`${styles.blockData} ${styles.dataCompact}`}>
      {panelTab === 'questionnaire1' ? (
        <RepairManagerQuestionnaire1Tab
          form={form}
          onPatch={onPatchManagerQuestionnaire1}
          onToggleTrafficSource={onToggleManagerQuestionnaire1Traffic}
          onToggleWhyChosen={onToggleManagerQuestionnaire1WhyChosen}
          onToggleClientNeed={onToggleManagerQuestionnaire1Need}
          syncSourceLabel={linkedCrmCustomerId ? 'package' : 'unlinked'}
        />
      ) : (
        <RepairPostWorkQuestionnaire2Tab form={form} onPatch={onPatchPostWorkQuestionnaire2} />
      )}
      <div className={styles.estimateA4Wrap}>
        <article className={styles.estimateA4Sheet}>
          <div
            className={styles.contractA4Preview}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </article>
      </div>
    </div>
  );
}
