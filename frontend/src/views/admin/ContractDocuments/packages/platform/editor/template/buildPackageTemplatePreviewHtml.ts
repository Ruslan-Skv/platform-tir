import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { applyTemplate } from '../../../../core/applyTemplate';
import { prepareContractTemplateHtmlForPreview } from '../../../../core/typography/contractTemplateTypography';
import { packageUsesLineSpecification } from '../../../config';
import { ensureDoorsDeliveryNoteProductsHtml } from '../../../families/product-like/specification/doorsSpecification';
import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import type { PackageFormData } from '../../form/packageForm';
import { packageFormForTemplate } from '../../form/packageForm';
import { buildManagerQuestionnaire1PrintHtml } from '../../questionnaires/managerQuestionnaire1Print';
import { buildPostWorkQuestionnaire2PrintHtml } from '../../questionnaires/postWorkQuestionnaire2Print';
import { isPackagePlainCustomerTab } from '../../tabs/packageActPrintTabs';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';

export type BuildPackageTemplatePreviewHtmlOptions = {
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  windowsWorkOrderMarkupPercent: number;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
};

export function buildPackageTemplatePreviewHtml(
  tab: PackageDocumentTabId,
  options: BuildPackageTemplatePreviewHtmlOptions
): string {
  const {
    form,
    packageKind,
    windowsWorkOrderMarkupPercent,
    estimatePresets,
    estimateGroups,
    templateOverrides,
    resolveTemplateHtml,
  } = options;

  if (
    tab === 'interactiveFinalEstimate' ||
    tab === 'finalWorkOrder' ||
    tab === 'finalEstimate' ||
    tab === 'specification'
  ) {
    return '';
  }
  if (tab === 'questionnaire1') {
    return buildManagerQuestionnaire1PrintHtml(
      packageFormForTemplate(form, {
        templateTab: 'estimate',
        estimatePresets,
        estimateGroups,
      })
    );
  }
  if (tab === 'questionnaire2') {
    return buildPostWorkQuestionnaire2PrintHtml(
      packageFormForTemplate(form, {
        templateTab: 'estimate',
        estimatePresets,
        estimateGroups,
      }),
      { packageKind }
    );
  }
  const templateTab = tab as PackageDocumentTemplateTabId;
  const formForTpl = packageFormForTemplate(form, {
    templateTab,
    estimatePresets,
    estimateGroups,
    packageKind,
    windowsWorkOrderMarkupPercent,
  });
  const tpl = templateOverrides[templateTab] ?? resolveTemplateHtml(templateTab);
  let html = prepareContractTemplateHtmlForPreview(
    applyTemplate(tpl, formForTpl, {
      autoInsertContractSignatures: tab === 'contract',
      plainCustomerPlaceholders: isPackagePlainCustomerTab(tab),
    })
  );
  if (tab === 'deliveryNote' && packageUsesLineSpecification(packageKind)) {
    html = ensureDoorsDeliveryNoteProductsHtml(html, formForTpl.deliveryNote?.productsHtml ?? '');
  }
  return html;
}
