import type { AdminAttribute, AdminAttributeType } from '@/shared/api/admin-attributes';

export type AttributeFormState = {
  name: string;
  slug: string;
  type: AdminAttributeType;
  unit: string;
  isFilterable: boolean;
  optionRows: string[];
};

export type AttributesToast = { type: 'ok' | 'err'; text: string };

export type { AdminAttribute, AdminAttributeType };
