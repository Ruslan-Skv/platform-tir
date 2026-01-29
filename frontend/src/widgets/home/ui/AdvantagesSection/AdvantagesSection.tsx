'use client';

import React, { useEffect, useState } from 'react';

import { AdvantageCard } from './AdvantageCard';
import styles from './AdvantagesSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

interface AdvantageItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
}

interface AdvantagesData {
  block: { title: string; subtitle: string };
  items: AdvantageItem[];
}

const DEFAULT_DATA: AdvantagesData = {
  block: { title: 'Почему выбирают нас', subtitle: 'Мы делаем качество доступным' },
  items: [],
};

export const AdvantagesSection: React.FC = () => {
  const [data, setData] = useState<AdvantagesData>(DEFAULT_DATA);

  useEffect(() => {
    fetch(`${API_URL}/home/advantages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d: AdvantagesData | null) => {
        if (d?.block) setData(d);
      })
      .catch(() => {});
  }, []);

  const imageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const isIconImageUrl = (icon: string) =>
    !!(icon && typeof icon === 'string' && icon.includes('/uploads/'));

  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{data.block.title}</h2>
          <p className={styles.subtitle}>{data.block.subtitle}</p>
        </div>

        <div className={styles.grid}>
          {data.items.map((item) => {
            const advantage = {
              id: item.id,
              icon: isIconImageUrl(item.icon) ? imageUrl(item.icon) : item.icon,
              title: item.title,
              description: item.description,
            };
            return <AdvantageCard key={item.id} advantage={advantage} />;
          })}
        </div>
      </div>
    </section>
  );
};
