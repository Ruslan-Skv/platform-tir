import { describe, expect, it } from 'vitest';

import {
  defaultFurniturePackageBlock,
  furnitureEnabledContractNumbers,
  normalizeFurniturePackageBlock,
} from './furnitureLegs';

describe('furnitureLegs', () => {
  it('defaults manufacture on and optional legs off', () => {
    const block = defaultFurniturePackageBlock();
    expect(block.manufacture.enabled).toBe(true);
    expect(block.montage.enabled).toBe(false);
    expect(block.appliances.enabled).toBe(false);
  });

  it('forces manufacture.enabled=true on normalize', () => {
    const block = normalizeFurniturePackageBlock({
      manufacture: { enabled: false, contract: { number: '1м-1' } },
      montage: { enabled: true, contract: { number: '1с-2' } },
    });
    expect(block.manufacture.enabled).toBe(true);
    expect(block.manufacture.contract.number).toBe('1м-1');
    expect(block.montage.enabled).toBe(true);
    expect(block.montage.contract.number).toBe('1с-2');
    expect(block.appliances.enabled).toBe(false);
  });

  it('lists numbers of enabled legs', () => {
    const block = normalizeFurniturePackageBlock({
      manufacture: { enabled: true, contract: { number: ' а ' } },
      montage: { enabled: true, contract: { number: 'б' } },
      appliances: { enabled: false, contract: { number: 'в' } },
    });
    expect(furnitureEnabledContractNumbers(block)).toEqual(['а', 'б']);
  });

  it('keeps appliances activeDocLeg only when appliances enabled', () => {
    const off = normalizeFurniturePackageBlock({
      appliances: { enabled: false },
      activeDocLeg: 'appliances',
    });
    expect(off.activeDocLeg).toBe('manufacture');
    expect(off.appliancesDocs.lines.length).toBeGreaterThan(0);

    const on = normalizeFurniturePackageBlock({
      appliances: { enabled: true },
      activeDocLeg: 'appliances',
    });
    expect(on.activeDocLeg).toBe('appliances');
  });
});
