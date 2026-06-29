import Link from 'next/link';

import { type SellerLegalInfo, isSellerLegalConfigured } from '@/shared/lib/legal/seller-legal';

import styles from './SellerLegalPageView.module.css';

type SellerLegalPageViewProps = {
  data: SellerLegalInfo | null;
};

export function SellerLegalPageView({ data }: SellerLegalPageViewProps) {
  if (!data) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.title}>Информация о продавце</h1>
        <p>Информация о продавце пока не опубликована.</p>
      </div>
    );
  }

  const configured = isSellerLegalConfigured(data);

  return (
    <article className={styles.page}>
      <h1 className={styles.title}>{data.pageTitle}</h1>
      {!configured ? (
        <p className={styles.incomplete}>
          Сведения о продавце заполнены не полностью. Обратитесь к администратору сайта.
        </p>
      ) : null}
      <dl className={styles.list}>
        {data.legalName ? (
          <div className={styles.row}>
            <dt>Полное наименование</dt>
            <dd>{data.legalName}</dd>
          </div>
        ) : null}
        {data.inn ? (
          <div className={styles.row}>
            <dt>ИНН</dt>
            <dd>{data.inn}</dd>
          </div>
        ) : null}
        {data.ogrn ? (
          <div className={styles.row}>
            <dt>{data.ogrnLabel}</dt>
            <dd>{data.ogrn}</dd>
          </div>
        ) : null}
        {data.legalAddress ? (
          <div className={styles.row}>
            <dt>Юридический адрес</dt>
            <dd>{data.legalAddress}</dd>
          </div>
        ) : null}
        {data.phone ? (
          <div className={styles.row}>
            <dt>Контактный телефон</dt>
            <dd>
              <a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`}>{data.phone}</a>
            </dd>
          </div>
        ) : null}
        {data.email ? (
          <div className={styles.row}>
            <dt>E-mail</dt>
            <dd>
              <a href={`mailto:${data.email}`}>{data.email}</a>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className={styles.back}>
        <Link href="/">← На главную</Link>
      </p>
    </article>
  );
}
