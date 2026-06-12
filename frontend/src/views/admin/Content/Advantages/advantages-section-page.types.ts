export type AdvantagesBlock = {
  title: string;
  subtitle: string;
};

export type AdvantageItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
};

export type AdvantagesData = {
  block: AdvantagesBlock;
  items: AdvantageItem[];
};

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type NewAdvantageItemForm = {
  icon: string;
  title: string;
  description: string;
};
