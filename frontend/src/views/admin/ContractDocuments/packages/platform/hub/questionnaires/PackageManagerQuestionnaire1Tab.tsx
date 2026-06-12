'use client';

import type { PackageFormData, PackageManagerQuestionnaire1Block } from '../../form/packageForm';
import { PackageManagerQuestionnaire1TabView } from './PackageManagerQuestionnaire1TabView';

export type PackageManagerQuestionnaire1TabProps = {
  form: PackageFormData;
  onPatch: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  onToggleTrafficSource: (id: string) => void;
  onToggleWhyChosen: (id: string) => void;
  onToggleClientNeed: (id: string) => void;
  /** `crm` — анкета из карточки клиента; `package` — привязан CRM; иначе подсказка о привязке. */
  syncSourceLabel?: 'crm' | 'package' | 'unlinked' | null;
};

export function PackageManagerQuestionnaire1Tab(props: PackageManagerQuestionnaire1TabProps) {
  return <PackageManagerQuestionnaire1TabView {...props} />;
}
