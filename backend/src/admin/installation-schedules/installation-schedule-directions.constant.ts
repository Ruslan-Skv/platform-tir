export const INSTALLATION_SCHEDULE_DIRECTIONS = [
  'WINDOWS',
  'DOORS',
  'CEILINGS',
  'FURNITURE',
  'BLINDS',
] as const;

export type InstallationScheduleDirection = (typeof INSTALLATION_SCHEDULE_DIRECTIONS)[number];
