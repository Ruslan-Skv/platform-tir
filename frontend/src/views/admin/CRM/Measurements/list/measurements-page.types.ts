export type MeasurementLinksInfo = {
  estimateId?: string;
  estimateTitle?: string;
  packageId?: string;
  packageTitle?: string;
  /** Договор связан с замером вручную (вкладка «Замер» пакета), без цепочки расчётов. */
  manual?: boolean;
};
