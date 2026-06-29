import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import { normalizeHomeSectionsVisibility } from '@/shared/lib/home-sections-visibility';
import { HomePage } from '@/widgets/home';

async function getHeroData() {
  try {
    const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    const base = apiBase.replace(/\/$/, '');
    const url = base.endsWith('/api/v1') ? `${base}/home/hero` : `${base}/api/v1/home/hero`;
    const res = await serverFetch(url, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch {
    // ignore
  }
  return null;
}

async function getSectionsVisibility() {
  try {
    const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    const base = apiBase.replace(/\/$/, '');
    const url = base.endsWith('/api/v1') ? `${base}/home/sections` : `${base}/api/v1/home/sections`;
    const res = await serverFetch(url, { cache: 'no-store' });
    if (res.ok) return normalizeHomeSectionsVisibility(await res.json());
  } catch {
    // ignore
  }
  return undefined;
}

export default async function Home() {
  const [heroData, sectionsVisibility] = await Promise.all([
    getHeroData(),
    getSectionsVisibility(),
  ]);

  return <HomePage initialHeroData={heroData} initialSectionsVisibility={sectionsVisibility} />;
}
