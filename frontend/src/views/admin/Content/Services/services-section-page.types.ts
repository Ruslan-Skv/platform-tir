export type ServicesBlock = {
  title: string;
  subtitle: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type ServicesData = {
  block: ServicesBlock;
  items: ServiceItem[];
};

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type NewServiceItemForm = {
  title: string;
  description: string;
  features: string;
  price: string;
  imageUrl: string;
};
