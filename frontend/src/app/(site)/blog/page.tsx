import { BlogPage } from '@/pages/blog/ui/BlogPage';

export default function BlogListPage() {
  return <BlogPage />;
}

export function generateMetadata() {
  return {
    title: 'Блог | Территория интерьерных решений',
    description:
      'Полезные статьи, советы и новости от Территории интерьерных решений. Советы по ремонту, выбору дверей, мебели и интерьерным решениям.',
  };
}
