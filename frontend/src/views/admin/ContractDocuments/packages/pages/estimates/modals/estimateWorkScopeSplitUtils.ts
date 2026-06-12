import type { SiblingClaim } from '../../../platform/estimates/estimateWorkScopeTree';

export function isLineKeyClaimedBySibling(
  lineId: string,
  claimIndex: Map<string, SiblingClaim[]>,
  selectedKeys: string[]
): boolean {
  if (selectedKeys.includes(lineId)) return false;
  return (claimIndex.get(lineId)?.length ?? 0) > 0;
}
