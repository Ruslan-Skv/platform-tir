export type HeroSlideShowMode = 'auto' | 'manual' | 'static';

export type HeroBlock = {
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  slideShowMode?: HeroSlideShowMode;
  slideGap?: number;
};

export type HeroSlide = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export type HeroFeature = {
  id: string;
  icon: string;
  title: string;
  sortOrder: number;
};

export type HeroData = {
  block: HeroBlock;
  slides: HeroSlide[];
  features: HeroFeature[];
};

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type NewFeatureForm = {
  icon: string;
  title: string;
};
