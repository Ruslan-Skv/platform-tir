import { ReviewsSection } from '@/views/admin/Settings';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

export default function AdminReviewsPage() {
  return (
    <SettingsSubPageView
      title="Отзывы и оценки"
      subtitle="Настройки блока отзывов на главной странице и модерации отзывов."
    >
      <ReviewsSection />
    </SettingsSubPageView>
  );
}
