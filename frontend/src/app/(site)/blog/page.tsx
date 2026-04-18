import { BlogPage } from '@/views/blog/ui/BlogPage';

export default function BlogListPage() {
  return <BlogPage />;
}

export function generateMetadata() {
  return {
    title: 'Полезные статьи | Территория интерьерных решений',
    description:
      'Полезные статьи и советы от Территории интерьерных решений: ремонт, двери, мебель и интерьер.',
  };
}
