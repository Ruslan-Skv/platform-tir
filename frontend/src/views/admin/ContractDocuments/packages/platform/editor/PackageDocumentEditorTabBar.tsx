'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import { isProductLikePackageKind } from '../../config';
import { packageEditorTabLabel } from '../tabs';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';

function PackageTabLockIcon() {
  return (
    <svg
      className={cdProduct.packageTabLockIcon}
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export type PackageDocumentEditorTabBarProps = {
  packageKind: ContractDocumentPackageKind;
  tabs: readonly PackageDocumentTabId[];
  activeTab: PackageDocumentTabId;
  contractAndEstimateLocked: boolean;
  unsignedAddendumOrdinals: number[];
  signedAddendumOrdinals: number[];
  onTabActivate: (id: PackageDocumentTabId) => void;
  onTabDragStart: (id: PackageDocumentTabId, event: React.DragEvent<HTMLButtonElement>) => void;
  onTabDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  onTabDrop: (id: PackageDocumentTabId) => (event: React.DragEvent<HTMLButtonElement>) => void;
};

export function PackageDocumentEditorTabBar({
  packageKind,
  tabs,
  activeTab,
  contractAndEstimateLocked,
  unsignedAddendumOrdinals,
  signedAddendumOrdinals,
  onTabActivate,
  onTabDragStart,
  onTabDragOver,
  onTabDrop,
}: PackageDocumentEditorTabBarProps) {
  const isProductLike = isProductLikePackageKind(packageKind);

  return (
    <div
      className={cdChrome.packageTabList}
      role="tablist"
      aria-label="Разделы пакета. Перетащите вкладку, чтобы изменить порядок."
    >
      {tabs.map((id) => {
        const addendumTabMatch = /^addendum(\d)$/.exec(id);
        const addendumTabOrdinal = addendumTabMatch ? Number(addendumTabMatch[1]) : null;
        const isUnsignedAddendumTab =
          addendumTabOrdinal != null && unsignedAddendumOrdinals.includes(addendumTabOrdinal);
        const isSignedAddendumTab =
          addendumTabOrdinal != null && signedAddendumOrdinals.includes(addendumTabOrdinal);
        const label = packageEditorTabLabel(packageKind, id, true);
        const isContractSignedViewOnlyTab =
          contractAndEstimateLocked &&
          (id === 'contract' || id === 'estimate' || (isProductLike && id === 'specification'));
        const showTabLockIcon = isContractSignedViewOnlyTab || isSignedAddendumTab;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            draggable
            aria-selected={activeTab === id}
            title={
              isUnsignedAddendumTab
                ? `Д/с №${addendumTabOrdinal}: отметьте подписание во вкладке или в «Оплаты и Управление договором»`
                : isSignedAddendumTab
                  ? `${label} — только просмотр (Д/с подписано)`
                  : isContractSignedViewOnlyTab
                    ? `${packageEditorTabLabel(packageKind, id)} — только просмотр (договор подписан)`
                    : `${packageEditorTabLabel(packageKind, id)} — перетащите для смены порядка`
            }
            className={`${cdChrome.tab} ${activeTab === id ? cdChrome.tabActive : ''} ${
              isUnsignedAddendumTab ? cdDataTab.packageTabAddendumUnsigned : ''
            } ${
              id === 'finalEstimate' && !isProductLike
                ? `${cdChrome.summaryTab} ${cdChrome.summaryTabFirst} ${cdChrome.summaryTabLast}`
                : ''
            }`}
            onClick={() => onTabActivate(id)}
            onDragStart={(e) => onTabDragStart(id, e)}
            onDragOver={onTabDragOver}
            onDrop={onTabDrop(id)}
          >
            <span className={cdProduct.packageTabLabelInner}>
              {showTabLockIcon ? <PackageTabLockIcon /> : null}
              <span>{label}</span>
              {isUnsignedAddendumTab ? (
                <span
                  className={cdDataTab.packageTabAddendumSignBadge}
                  title="Доп. соглашение не отмечено как подписанное"
                >
                  Подписать
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
