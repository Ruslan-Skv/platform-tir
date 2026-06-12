export type FooterLink = {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
};

export type FooterSectionData = {
  id: string;
  title: string;
  links: FooterLink[];
  sortOrder: number;
};

export type FooterBlock = {
  workingHours: { weekdays: string; saturday: string; sunday: string };
  phone: string;
  email: string;
  developer: string;
  copyrightCompanyName: string;
  socialLinks: {
    vk: { name: string; href: string; icon: string; ariaLabel: string };
  };
};

export type FooterData = {
  block: FooterBlock;
  sections: FooterSectionData[];
};

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type NewLinkForm = {
  name: string;
  href: string;
};
