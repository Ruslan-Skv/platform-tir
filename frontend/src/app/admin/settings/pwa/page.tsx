'use client';

import styles from '@/views/admin/Settings/shared/SettingsPage.module.css';

export default function AdminPwaSettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>PWA и стратегия обновления</h1>
        <p className={styles.subtitle}>
          Описание работы обновления приложения при установке на смартфон (PWA).
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Порядок работы стратегии обновления</h2>

        <div className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>1. Кэширование данных (StaleWhileRevalidate)</h3>
          <ul className={styles.infoBlockList}>
            <li>
              <strong>Эндпоинты:</strong> <code>/api/v1/products/*</code>,{' '}
              <code>/api/v1/home/*</code> (товары, каталог, популярные товары, настройки партнёров).
            </li>
            <li>
              При первом запросе ответ сохраняется в кэш браузера (до 24 часов, макс. 100 записей).
            </li>
            <li>
              При повторном запросе — <strong>сразу</strong> показываются данные из кэша, а в фоне
              выполняется новый запрос к серверу.
            </li>
            <li>
              После получения свежих данных кэш обновляется. Пользователь видит быстрый отклик, при
              этом информация актуализируется в фоне.
            </li>
          </ul>
        </div>

        <div className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>2. Обнаружение новой версии приложения</h3>
          <ul className={styles.infoBlockList}>
            <li>
              При каждом деплое в файл <code>sw.js</code> (Service Worker) записывается новая
              версия.
            </li>
            <li>
              При загрузке или навигации браузер проверяет, изменился ли <code>sw.js</code>.
            </li>
            <li>
              Если найдена новая версия, загружается новый Service Worker и переходит в состояние
              «ожидания» (waiting).
            </li>
          </ul>
        </div>

        <div className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>3. Попап «Доступна новая версия. Обновить?»</h3>
          <ul className={styles.infoBlockList}>
            <li>
              Когда новый Service Worker готов, внизу экрана появляется баннер с кнопками «Обновить»
              и «Позже».
            </li>
            <li>
              <strong>«Позже»</strong> — баннер скрывается. Обновление не применяется до следующего
              визита или перезагрузки страницы.
            </li>
            <li>
              <strong>«Обновить»</strong> — новый Service Worker активируется, страница
              перезагружается. Пользователь получает актуальную версию приложения.
            </li>
            <li>
              Решение о моменте обновления остаётся за пользователем — обновление не навязывается.
            </li>
          </ul>
        </div>

        <div className={styles.infoBlock}>
          <h3 className={styles.infoBlockTitle}>Краткая схема</h3>
          <ul className={styles.infoBlockList}>
            <li>
              Деплой → обновление <code>sw.js</code> → браузер обнаруживает новую версию
            </li>
            <li>→ новый SW в состоянии waiting → баннер «Доступна новая версия»</li>
            <li>→ пользователь нажимает «Обновить» → активация SW → перезагрузка</li>
          </ul>
        </div>

        <p className={styles.sectionDescription}>
          Баннер отображается только на публичной части сайта. Service Worker работает по HTTPS (в
          production) или localhost. Подробнее: <code>docs/PWA.md</code>.
        </p>
      </section>
    </div>
  );
}
