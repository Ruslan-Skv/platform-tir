export type PrimaryFilter = 'featured' | 'new' | 'featured_or_new' | 'any';
export type SecondaryOrder = 'sort_order' | 'created_desc';

export interface FeaturedProductsBlock {
  title: string;
  subtitle: string;
  limit: number;
  primaryFilter: PrimaryFilter;
  secondaryOrder: SecondaryOrder;
}
