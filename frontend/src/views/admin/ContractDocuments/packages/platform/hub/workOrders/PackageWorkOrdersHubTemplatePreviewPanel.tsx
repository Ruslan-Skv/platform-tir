'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { PackageWorkOrderGradeButtons } from './PackageWorkOrderGradeButtons';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import type { PackageWorkOrderHubTabId } from './packageWorkOrderHubTabs';
import { WO_A4_WRAP, WO_FORM_GRID, woPanelRootClass } from './packageWorkOrdersHubPanelStyles';

export type PackageWorkOrdersHubTemplatePreviewPanelProps = {
  panelTab: PackageWorkOrderHubTabId;
};

export function PackageWorkOrdersHubTemplatePreviewPanel({
  panelTab,
}: PackageWorkOrdersHubTemplatePreviewPanelProps) {
  const { isWindowsPackage, form, updateWorkOrder, getTemplatePreviewHtml } =
    usePackageWorkOrderHub();

  const renderedDoc = getTemplatePreviewHtml(panelTab);

  return (
    <div className={woPanelRootClass(isWindowsPackage)}>
      <div
        className={`${WO_FORM_GRID} ${cdEstimatesList.workOrderParamsBar}`}
        style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
      >
        {!isWindowsPackage ? (
          <PackageWorkOrderGradeButtons
            value={form.workOrder.gradeIncreasePercent}
            onChange={(gradeIncreasePercent) =>
              updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
            }
          />
        ) : null}
        <label
          className={`${cdEstimatesList.managerQuestionnaireNeedRow} ${cdEstimatesList.packageWorkOrderShowAmountsLabel}`}
          htmlFor="repair_work_order_show_amounts"
          style={{ margin: 0, fontSize: '0.74rem', whiteSpace: 'nowrap' }}
        >
          <input
            id="repair_work_order_show_amounts"
            type="checkbox"
            checked={form.workOrder.showLineAmounts}
            onChange={(e) => updateWorkOrder('showLineAmounts', e.target.checked)}
          />
          <span>Показывать стоимость в каждой позиции</span>
        </label>
      </div>
      <div className={WO_A4_WRAP}>
        <article className={cdDocPreview.estimateA4Sheet}>
          <div
            className={cdProduct.contractA4Preview}
            dangerouslySetInnerHTML={{ __html: renderedDoc }}
          />
        </article>
      </div>
    </div>
  );
}
