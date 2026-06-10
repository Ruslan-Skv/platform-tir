import { useCallback, useState } from 'react';

import { getMeasurements } from '@/shared/api/admin-crm';

import type { CompletedMeasurementOption } from '../../modals/EstimateGenerateFromMeasurementModal';

export function useEstimatesListGenerateFromMeasurement(setError: (message: string) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [completedMeasurements, setCompletedMeasurements] = useState<CompletedMeasurementOption[]>(
    []
  );
  const [busy, setBusy] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('');

  const open = useCallback(async () => {
    setIsOpen(true);
    setBusy(true);
    setSelectedMeasurementId('');
    try {
      const res = await getMeasurements({ status: 'COMPLETED', page: 1, limit: 200 });
      const rows = (res.data ?? [])
        .filter((m) => (m.comments ?? '').includes('[REPAIR_MEASUREMENT_DATA_V1]'))
        .map((m) => ({
          id: m.id,
          customerName: m.customerName || 'Без имени',
          customerAddress: m.customerAddress ?? null,
          receptionDate: m.receptionDate,
        }));
      setCompletedMeasurements(rows);
      if (rows.length > 0) setSelectedMeasurementId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить выполненные замеры');
    } finally {
      setBusy(false);
    }
  }, [setError]);

  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    completedMeasurements,
    busy,
    selectedMeasurementId,
    setSelectedMeasurementId,
    open,
    close,
  };
}
