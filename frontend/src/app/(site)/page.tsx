import { serverFetch } from '@/shared/lib/fetch-with-timeout';
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

export default async function Home() {
  const heroData = await getHeroData();
  return <HomePage initialHeroData={heroData} />;
}
