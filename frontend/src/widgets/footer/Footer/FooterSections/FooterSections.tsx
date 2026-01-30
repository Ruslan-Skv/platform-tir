import React from 'react';

import type { CompanyInfo, SocialLinks } from '@/shared/constants/footer';

import { ContactSection } from './ContactSection';
import styles from './FooterSections.module.css';

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

interface FooterSectionsProps {
  sections: FooterSectionData[];
  companyInfo: CompanyInfo;
  socialLinks: SocialLinks;
}

function LinkSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <ul className={styles.list}>
        {links.map((link) => (
          <li key={link.id}>
            <a href={link.href} className={styles.link}>
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const FooterSections: React.FC<FooterSectionsProps> = ({
  sections,
  companyInfo,
  socialLinks,
}) => {
  return (
    <div className={styles.sections}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {sections.map((section) => (
            <LinkSection
              key={section.id || `section-${section.title}`}
              title={section.title}
              links={section.links}
            />
          ))}
          <ContactSection companyInfo={companyInfo} socialLinks={socialLinks} />
        </div>
      </div>
    </div>
  );
};
