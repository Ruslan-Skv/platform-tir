import { HomePage } from '@/widgets/home';

async function getHeroData() {
  try {
    const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/v1/home/hero`, { cache: 'no-store' });
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
