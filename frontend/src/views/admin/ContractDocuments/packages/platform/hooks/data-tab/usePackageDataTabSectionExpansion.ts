import { useState } from 'react';

import {
  packageCustomerSectionCompletionPercent,
  packageExecutorSectionCompletionPercent,
  packageManagerSectionCompletionPercent,
} from '../../editor/dataTab/packageDataTabCompletion';
import type { PackageFormData } from '../../form/packageForm';

export function usePackageDataTabSectionExpansion(
  form: PackageFormData,
  _linkedCrmCustomerId: string | null
) {
  const [customerDataSectionExpanded, setCustomerDataSectionExpanded] = useState(false);
  const [executorDataSectionExpanded, setExecutorDataSectionExpanded] = useState(false);
  const [managerDataSectionExpanded, setManagerDataSectionExpanded] = useState(false);

  return {
    customerDataSectionExpanded,
    setCustomerDataSectionExpanded,
    executorDataSectionExpanded,
    setExecutorDataSectionExpanded,
    managerDataSectionExpanded,
    setManagerDataSectionExpanded,
    customerSectionCompletionPercent: packageCustomerSectionCompletionPercent(form),
    executorSectionCompletionPercent: packageExecutorSectionCompletionPercent(form),
    managerSectionCompletionPercent: packageManagerSectionCompletionPercent(form),
  };
}
