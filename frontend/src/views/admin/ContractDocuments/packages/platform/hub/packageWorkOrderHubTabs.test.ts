import {
  defaultPackageWorkOrderHubTab,
  packageWorkOrderHubTabsForPackage,
} from './packageWorkOrderHubTabs';

describe('packageWorkOrderHubTabsForPackage WINDOWS', () => {
  it('includes work order addendum tabs when addendum slots are open', () => {
    const tabs = packageWorkOrderHubTabsForPackage(2, 'WINDOWS');
    expect(tabs).toContain('workOrder');
    expect(tabs).toContain('workOrderAddendum1');
    expect(tabs).toContain('workOrderAddendum2');
    expect(tabs).not.toContain('workOrderAddendum3');
  });

  it('defaults to work order tab when preferred addendum tab is not open', () => {
    expect(defaultPackageWorkOrderHubTab('workOrderAddendum3', 1, 'WINDOWS')).toBe('workOrder');
    expect(defaultPackageWorkOrderHubTab('workOrderAddendum1', 2, 'WINDOWS')).toBe(
      'workOrderAddendum1'
    );
  });
});
