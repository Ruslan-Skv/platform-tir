'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import {
  PACKAGE_TAB_A4,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_CHECK_ROW,
  PACKAGE_TAB_TOOLBAR_ROW,
} from '../../ui/packageTabClassNames';
import { PackageWorkOrderGradeButtons } from './PackageWorkOrderGradeButtons';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import type { PackageWorkOrderTemplateHubTab } from './packageWorkOrderHubTabs';
import {
  WO_A4_WRAP,
  WO_FORM_GRID,
  WO_SECTION_CARD,
  woPanelRootClass,
} from './packageWorkOrdersHubPanelStyles';

export type PackageWorkOrdersHubTemplatePreviewPanelProps = {
  panelTab: PackageWorkOrderTemplateHubTab;
};

export function PackageWorkOrdersHubTemplatePreviewPanel({
  panelTab,
}: PackageWorkOrdersHubTemplatePreviewPanelProps) {
  const { isWindowsPackage, form, updateWorkOrder, getTemplatePreviewHtml } =
    usePackageWorkOrderHub();

  const renderedDoc = getTemplatePreviewHtml(panelTab);

  return (
    <div className={woPanelRootClass(isWindowsPackage)}>
      <div className={WO_FORM_GRID}>
        <div className={`${WO_SECTION_CARD} ${PACKAGE_TAB_CARD}`}>
          <div className={PACKAGE_TAB_TOOLBAR_ROW}>
            {!isWindowsPackage ? (
              <PackageWorkOrderGradeButtons
                value={form.workOrder.gradeIncreasePercent}
                onChange={(gradeIncreasePercent) =>
                  updateWorkOrder('gradeIncreasePercent', gradeIncreasePercent)
                }
              />
            ) : null}
            <label className={PACKAGE_TAB_CHECK_ROW} htmlFor="repair_work_order_show_amounts">
              <input
                id="repair_work_order_show_amounts"
                type="checkbox"
                checked={form.workOrder.showLineAmounts}
                onChange={(e) => updateWorkOrder('showLineAmounts', e.target.checked)}
              />
              <span>Показывать стоимость в каждой позиции</span>
            </label>
          </div>
          <div className={`${WO_A4_WRAP} ${PACKAGE_TAB_A4}`}>
            <article className={cdDocPreview.estimateA4Sheet}>
              <div
                className={cdProduct.contractA4Preview}
                dangerouslySetInnerHTML={{ __html: renderedDoc }}
              />
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
