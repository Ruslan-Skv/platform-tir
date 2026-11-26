'use client';

import { isFurnitureLikePackageKind } from '../../../config/packageDirectionRegistry';
import { PackageDataFurnitureLegsSection } from '../../../directions/furniture/PackageDataFurnitureLegsSection';
import { PackageDataContractObjectSection } from './PackageDataContractObjectSection';
import { PackageDataCustomerPartySection } from './PackageDataCustomerPartySection';
import { PackageDataCustomerSearchColumn } from './PackageDataCustomerSearchColumn';
import { PackageDataExecutorPartySection } from './PackageDataExecutorPartySection';
import { PackageDataManagerPartySection } from './PackageDataManagerPartySection';
import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  DATA_BLOCK,
  DATA_CARD,
  DATA_FORM_GRID,
  DATA_HEAD,
  DATA_TITLE,
} from './packageDataTabStyles';

/** Вкладка «Данные»: карточка вкладки, внутри — белые панели разделов. */
export function PackageDataTabView(props: PackageDataTabProps) {
  const showFurnitureLegs = isFurnitureLikePackageKind(props.packageKind);

  return (
    <div className={DATA_BLOCK}>
      <div className={DATA_FORM_GRID}>
        <div className={DATA_CARD}>
          <div className={DATA_HEAD}>
            <h3 className={DATA_TITLE}>Данные</h3>
          </div>

          <div className={styles.dataTopRow}>
            <PackageDataContractObjectSection {...props} />
            <PackageDataCustomerSearchColumn {...props} />
          </div>

          {showFurnitureLegs ? (
            <PackageDataFurnitureLegsSection
              form={props.form}
              setForm={props.setForm}
              touchPackageData={props.touchPackageData}
              signedDocsLocked={props.signedDocsLocked}
              packageKind={props.packageKind}
              packageId={props.packageId}
              executorProfiles={props.executorProfiles}
              updateContract={props.updateContract}
              applyExecutorProfile={props.applyExecutorProfile}
            />
          ) : null}

          <PackageDataCustomerPartySection {...props} />
          <PackageDataExecutorPartySection {...props} />
          <PackageDataManagerPartySection {...props} />
        </div>
      </div>
    </div>
  );
}
