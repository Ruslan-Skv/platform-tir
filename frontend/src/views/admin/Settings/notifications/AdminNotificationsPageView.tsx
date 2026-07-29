import Link from 'next/link';

import styles from '../shared/SettingsPage.module.css';
import { SettingsSubPageView } from '../shared/SettingsSubPageView';
import { NotificationsRulesInfoTip } from './NotificationsRulesInfoTip';
import { NotificationsSection } from './NotificationsSection';

export function AdminNotificationsPageView() {
  return (
    <SettingsSubPageView
      title="Уведомления в админке"
      titleAside={<NotificationsRulesInfoTip />}
      subtitle="Звук, браузерные и push-уведомления при событиях в панели управления."
    >
      <p className={styles.sectionDescription}>
        Каналы email, Telegram и MAX для заявок настраиваются в разделе{' '}
        <Link href="/admin/settings/notification-channels" className={styles.infoBlockLink}>
          Каналы уведомлений о заявках
        </Link>
        .
      </p>
      <NotificationsSection />
    </SettingsSubPageView>
  );
}
