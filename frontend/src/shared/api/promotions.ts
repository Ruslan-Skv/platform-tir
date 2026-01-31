const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface Promotion {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getPromotions(): Promise<Promotion[]> {
  const res = await fetch(`${API_URL}/promotions`);
  if (!res.ok) throw new Error('Не удалось загрузить акции');
  return res.json();
}
