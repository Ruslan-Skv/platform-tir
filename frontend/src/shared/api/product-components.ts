const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ProductComponent {
  id: string;
  productId: string;
  name: string;
  type: string;
  price: string;
  image?: string | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function getProductComponents(productId: string): Promise<ProductComponent[]> {
  const response = await fetch(`${API_URL}/product-components/product/${productId}`);

  if (!response.ok) {
    throw new Error('Не удалось загрузить комплектующие');
  }

  return response.json();
}
