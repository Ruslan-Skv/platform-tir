import { PromotionsPage } from '@/pages/promotions/ui/PromotionsPage/PromotionsPage';

export default function PromotionsListPage() {
  return <PromotionsPage />;
}

export function generateMetadata() {
  return {
    title: 'Акции | Территория интерьерных решений',
    description:
      'Специальные предложения и выгодные условия на двери, окна, мебель и ремонт от Территории интерьерных решений в Мурманске.',
  };
}
