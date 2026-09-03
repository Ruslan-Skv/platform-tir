'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';
import { isFurnitureLikePackageKind } from '../../../config/packageDirectionRegistry';
import { PackageDataFurnitureLegsSection } from '../../../directions/furniture/PackageDataFurnitureLegsSection';
import { PackageDataContractObjectSection } from './PackageDataContractObjectSection';
import { PackageDataCustomerPartySection } from './PackageDataCustomerPartySection';
import { PackageDataCustomerSearchColumn } from './PackageDataCustomerSearchColumn';
import { PackageDataExecutorPartySection } from './PackageDataExecutorPartySection';
import { PackageDataManagerPartySection } from './PackageDataManagerPartySection';
import type { PackageDataTabProps } from './PackageDataTab';
import { DATA_BLOCK, DATA_FORM_GRID, DATA_TAB_DENSE, DATA_TOP_ROW } from './packageDataTabStyles';

export function PackageDataTabView(props: PackageDataTabProps) {
  const showFurnitureLegs = isFurnitureLikePackageKind(props.packageKind);

  return (
    <div className={`${DATA_BLOCK} ${cdDataTab.dataCompact} ${DATA_TAB_DENSE}`}>
      <div className={DATA_FORM_GRID}>
        <div className={DATA_TOP_ROW}>
          <PackageDataContractObjectSection {...props} />
          <PackageDataCustomerSearchColumn {...props} />
        </div>

        {showFurnitureLegs ? (
          <PackageDataFurnitureLegsSection
            form={props.form}
            setForm={props.setForm}
            touchPackageData={props.touchPackageData}
            contractAndEstimateLocked={props.contractAndEstimateLocked}
            packageKind={props.packageKind}
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
  );
}
