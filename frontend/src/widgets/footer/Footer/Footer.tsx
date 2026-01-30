'use client';

import React, { useEffect, useState } from 'react';

import styles from './Footer.module.css';
import { FooterBottom } from './FooterBottom';
import { FooterSections } from './FooterSections';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FooterLink {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

interface FooterSectionData {
  id: string;
  title: string;
  links: FooterLink[];
  sortOrder: number;
}

interface FooterBlock {
  workingHours: { weekdays: string; saturday: string; sunday: string };
  phone: string;
  email: string;
  developer: string;
  copyrightCompanyName: string;
  socialLinks: {
    vk: { name: string; href: string; icon: string; ariaLabel: string };
  };
}

interface FooterData {
  block: FooterBlock;
  sections: FooterSectionData[];
}

const defaultData: FooterData = {
  block: {
    workingHours: { weekdays: 'пн-пт: 11-19', saturday: 'сб: 12-16', sunday: 'вс: выходной' },
    phone: '8 (8152) 60-12-70',
    email: 'skvirya@mail.ru',
    developer: 'ИП Сквиря Р.В.',
    copyrightCompanyName: 'Территория интерьерных решений',
    socialLinks: {
      vk: {
        name: 'ВКонтакте',
        href: 'https://vk.com/pskpobeda',
        icon: '/images/icons-vk.png',
        ariaLabel: 'ВКонтакте',
      },
    },
  },
  sections: [
    {
      id: '',
      title: 'О нас',
      sortOrder: 0,
      links: [
        { id: '1', name: 'Контакты', href: '/contacts', sortOrder: 0 },
        { id: '2', name: 'Наши работы', href: '/portfolio', sortOrder: 1 },
        { id: '3', name: 'Вакансии', href: '/careers', sortOrder: 2 },
      ],
    },
    {
      id: '',
      title: 'Каталог',
      sortOrder: 1,
      links: [
        { id: '4', name: 'Ремонт квартир', href: '/repair', sortOrder: 0 },
        { id: '5', name: 'Двери', href: '/doors', sortOrder: 1 },
        { id: '6', name: 'Окна', href: '/windows', sortOrder: 2 },
        { id: '7', name: 'Потолки', href: '/ceilings', sortOrder: 3 },
        { id: '8', name: 'Жалюзи', href: '/blinds', sortOrder: 4 },
        { id: '9', name: 'Мебель', href: '/furniture', sortOrder: 5 },
        { id: '10', name: 'Акции', href: '/sales', sortOrder: 6 },
      ],
    },
  ],
};

export const Footer: React.FC = () => {
  const [data, setData] = useState<FooterData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/home/footer`);
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData(d);
        } else if (!cancelled) {
          setData(defaultData);
        }
      } catch {
        if (!cancelled) setData(defaultData);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const footerData = data ?? defaultData;
  const uniqueSections = footerData.sections.filter(
    (section, index, arr) => arr.findIndex((s) => s.title === section.title) === index
  );

  return (
    <footer className={styles.footer}>
      <FooterSections
        sections={uniqueSections}
        companyInfo={{
          workingHours: footerData.block.workingHours,
          phone: footerData.block.phone,
          email: footerData.block.email,
          developer: footerData.block.developer,
        }}
        socialLinks={footerData.block.socialLinks}
      />
      <FooterBottom
        copyrightCompanyName={footerData.block.copyrightCompanyName}
        developer={footerData.block.developer}
        email={footerData.block.email}
      />
    </footer>
  );
};
