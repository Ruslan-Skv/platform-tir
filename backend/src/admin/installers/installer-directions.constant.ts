export const INSTALLER_DIRECTIONS = [
  'REPAIR',
  'WINDOWS',
  'DOORS',
  'CEILINGS',
  'FURNITURE',
  'BLINDS',
] as const;

export type InstallerDirection = (typeof INSTALLER_DIRECTIONS)[number];
