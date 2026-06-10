import { useState } from 'react';

import {
  packageCustomerSectionCompletionPercent,
  packageExecutorSectionCompletionPercent,
  packageManagerSectionCompletionPercent,
} from '../editor/packageDataTabCompletion';
import type { PackageFormData } from '../form/packageForm';

export function usePackageDataTabSectionExpansion(
  form: PackageFormData,
  linkedCrmCustomerId: string | null
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
    customerSectionCompletionPercent: packageCustomerSectionCompletionPercent(
      form,
      linkedCrmCustomerId
    ),
    executorSectionCompletionPercent: packageExecutorSectionCompletionPercent(form),
    managerSectionCompletionPercent: packageManagerSectionCompletionPercent(form),
  };
}
