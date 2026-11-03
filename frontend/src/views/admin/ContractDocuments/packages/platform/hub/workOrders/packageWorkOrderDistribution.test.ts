import {
  getPackageWorkOrderDistributionInfo,
  packageWorkOrderDistributionClassName,
  packageWorkOrderDistributionTitleSuffix,
} from './packageWorkOrderDistribution';

jest.mock('../../../../styles/work-order-distribution.module.css', () => ({
  workOrderDistributedFull: 'workOrderDistributedFull',
  workOrderDistributedPartial: 'workOrderDistributedPartial',
}));

function snapshot(
  lines: Array<{ name: string; unit?: string; quantity?: number; amount?: number }>
) {
  return {
    total: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
    rooms: [
      {
        name: 'Комната',
        total: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
        lines: lines.map((line) => ({
          name: line.name,
          unit: line.unit ?? 'м²',
          quantity: line.quantity ?? 1,
          price: line.amount ?? 0,
          amount: line.amount ?? 0,
        })),
      },
    ],
  };
}

function formDataWithAssignments(
  lines: Array<{ name: string; amount?: number }>,
  assignedKeys: string[]
) {
  const snapshotValue = snapshot(lines);
  const assignments: Record<string, { installerId: string }> = {};
  for (const key of assignedKeys) {
    assignments[`Комната::${key}::м²`] = { installerId: 'installer-1' };
  }
  return {
    estimate: { snapshot: snapshotValue },
    finalEstimateInstallerAssignments: assignments,
  };
}

describe('getPackageWorkOrderDistributionInfo', () => {
  it('без сметы — позиций нет, статуса нет', () => {
    expect(getPackageWorkOrderDistributionInfo(undefined)).toEqual({
      status: null,
      totalRows: 0,
      assignedRows: 0,
    });
    expect(getPackageWorkOrderDistributionInfo({})).toEqual({
      status: null,
      totalRows: 0,
      assignedRows: 0,
    });
  });

  it('позиции есть, но мастера не назначены — статуса нет', () => {
    const info = getPackageWorkOrderDistributionInfo(
      formDataWithAssignments(
        [
          { name: 'Шпаклёвка', amount: 100 },
          { name: 'Покраска', amount: 200 },
        ],
        []
      )
    );
    expect(info).toEqual({ status: null, totalRows: 2, assignedRows: 0 });
  });

  it('все позиции назначены — full', () => {
    const info = getPackageWorkOrderDistributionInfo(
      formDataWithAssignments(
        [
          { name: 'Шпаклёвка', amount: 100 },
          { name: 'Покраска', amount: 200 },
        ],
        ['Шпаклёвка', 'Покраска']
      )
    );
    expect(info.status).toBe('full');
    expect(info.assignedRows).toBe(info.totalRows);
  });

  it('назначена часть позиций — partial', () => {
    const info = getPackageWorkOrderDistributionInfo(
      formDataWithAssignments(
        [
          { name: 'Шпаклёвка', amount: 100 },
          { name: 'Покраска', amount: 200 },
        ],
        ['Шпаклёвка']
      )
    );
    expect(info).toEqual({ status: 'partial', totalRows: 2, assignedRows: 1 });
  });

  it('полностью исключённая в Д/с позиция не мешает full', () => {
    const formData = {
      estimate: {
        snapshot: snapshot([
          { name: 'Шпаклёвка', amount: 100 },
          { name: 'Покраска', amount: 200 },
        ]),
      },
      addendumSlotCount: 1,
      addendumSlots: [
        {
          snapshot: null,
          excludedSnapshot: snapshot([{ name: 'Покраска', amount: 200 }]),
        },
      ],
      finalEstimateInstallerAssignments: {
        'Комната::Шпаклёвка::м²': { installerId: 'installer-1' },
      },
    };
    const info = getPackageWorkOrderDistributionInfo(formData);
    expect(info.status).toBe('full');
    expect(info.totalRows).toBe(1);
  });
});

describe('packageWorkOrderDistributionClassName', () => {
  it('full — класс зелёного фона, partial — жёлтого, null — без класса', () => {
    expect(packageWorkOrderDistributionClassName('full')).toBeTruthy();
    expect(packageWorkOrderDistributionClassName('partial')).toBeTruthy();
    expect(packageWorkOrderDistributionClassName('full')).not.toBe(
      packageWorkOrderDistributionClassName('partial')
    );
    expect(packageWorkOrderDistributionClassName(null)).toBeUndefined();
  });
});

describe('packageWorkOrderDistributionTitleSuffix', () => {
  it('дополняет тултип счётчиком распределённых позиций', () => {
    expect(
      packageWorkOrderDistributionTitleSuffix({ status: 'full', totalRows: 3, assignedRows: 3 })
    ).toContain('все позиции распределены мастерам (3 из 3)');
    expect(
      packageWorkOrderDistributionTitleSuffix({ status: 'partial', totalRows: 3, assignedRows: 1 })
    ).toContain('1 из 3');
    expect(
      packageWorkOrderDistributionTitleSuffix({ status: null, totalRows: 0, assignedRows: 0 })
    ).toBe('');
  });
});
