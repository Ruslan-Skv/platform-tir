'use client';

import type { PackageAddendumEstimateBlockProps } from './PackageAddendumEstimateBlockProps';
import { PackageAddendumEstimateBlockView } from './PackageAddendumEstimateBlockView';

export function PackageAddendumEstimateBlock(props: PackageAddendumEstimateBlockProps) {
  return <PackageAddendumEstimateBlockView {...props} />;
}
