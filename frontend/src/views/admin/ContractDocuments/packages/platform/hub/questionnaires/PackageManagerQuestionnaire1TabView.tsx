'use client';

import { PACKAGE_FORM_GRID } from '../../ui/packageTabClassNames';
import { ManagerQuestionnaireClientNeedsSection } from './ManagerQuestionnaireClientNeedsSection';
import { ManagerQuestionnaireCrossSellSection } from './ManagerQuestionnaireCrossSellSection';
import { ManagerQuestionnaireCustomerObjectSection } from './ManagerQuestionnaireCustomerObjectSection';
import { ManagerQuestionnaireIntroSection } from './ManagerQuestionnaireIntroSection';
import { ManagerQuestionnaireMasterPreferencesSection } from './ManagerQuestionnaireMasterPreferencesSection';
import { ManagerQuestionnaireOrderInfoSection } from './ManagerQuestionnaireOrderInfoSection';
import { ManagerQuestionnaireTrafficSection } from './ManagerQuestionnaireTrafficSection';
import { ManagerQuestionnaireWhyChosenSection } from './ManagerQuestionnaireWhyChosenSection';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export function PackageManagerQuestionnaire1TabView({
  form,
  onPatch,
  onToggleTrafficSource,
  onToggleWhyChosen,
  onToggleClientNeed,
  syncSourceLabel,
}: PackageManagerQuestionnaire1TabProps) {
  return (
    <div className={PACKAGE_FORM_GRID}>
      <ManagerQuestionnaireIntroSection syncSourceLabel={syncSourceLabel} />
      <ManagerQuestionnaireCustomerObjectSection form={form} onPatch={onPatch} />
      <ManagerQuestionnaireOrderInfoSection form={form} onPatch={onPatch} />
      <ManagerQuestionnaireTrafficSection
        form={form}
        onPatch={onPatch}
        onToggleTrafficSource={onToggleTrafficSource}
      />
      <ManagerQuestionnaireMasterPreferencesSection form={form} onPatch={onPatch} />
      <ManagerQuestionnaireWhyChosenSection
        form={form}
        onPatch={onPatch}
        onToggleWhyChosen={onToggleWhyChosen}
      />
      <ManagerQuestionnaireCrossSellSection form={form} onPatch={onPatch} />
      <ManagerQuestionnaireClientNeedsSection
        form={form}
        onPatch={onPatch}
        onToggleClientNeed={onToggleClientNeed}
      />
    </div>
  );
}
