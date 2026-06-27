/**
 * Smoke-тест публичных и админских сценариев после security-hardening.
 * Запуск: node scripts/smoke-security.mjs
 */
const API = process.env.SMOKE_API_URL || 'http://localhost:3001/api/v1';
const ORIGIN = process.env.SMOKE_ORIGIN || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@platform.local';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Admin123!';

const results = [];

function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, options = {}) {
  const url = `${API}${path}`;
  const headers = {
    Origin: ORIGIN,
    Accept: 'application/json',
    ...(options.json ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
    credentials: 'include',
    redirect: 'manual',
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function main() {
  console.log(`Smoke API: ${API}\n`);

  // Swagger удалён
  {
    const { res } = await request('/docs');
    log('Swagger /docs недоступен', res.status === 404, `status ${res.status}`);
  }

  // Каталог
  {
    const { res, data } = await request('/products/catalog/list?limit=3');
    const ok = res.ok && data && Array.isArray(data.products);
    const hasCostPrice =
      ok && data.products.some((p) => Object.prototype.hasOwnProperty.call(p, 'costPrice'));
    log('Каталог GET /products/catalog/list', ok, ok ? `${data.products.length} товаров` : res.status);
    log('Каталог без costPrice', ok && !hasCostPrice, hasCostPrice ? 'costPrice утёк' : 'ok');
  }

  // Логин
  let accessToken = null;
  {
    const { res, data } = await request('/auth/login', {
      method: 'POST',
      json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    accessToken = data?.access_token;
    log(
      'Логин POST /auth/login',
      res.ok && !!accessToken,
      res.ok ? `role=${data?.user?.role}` : JSON.stringify(data?.message || data),
    );
  }

  // Админка товаров
  {
    const { res, data } = await request('/products/admin/all', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    log(
      'Админка GET /products/admin/all',
      res.ok && Array.isArray(data),
      res.ok ? `${data.length} товаров` : JSON.stringify(data?.message || data),
    );
  }

  // Без токена — отказ на admin/all
  {
    const { res } = await request('/products/admin/all');
    log('Админка без JWT отклонена', res.status === 401, `status ${res.status}`);
  }

  // Квиз
  let quizSlug = 'remont';
  {
    const { res, data } = await request('/quiz/public/config?slug=remont');
    if (res.ok && data?.slug) quizSlug = data.slug;
    log('Квиз GET /quiz/public/config', res.ok && !!data?.slug, data?.slug || res.status);
  }
  {
    const { res, data } = await request(`/quiz/public/${quizSlug}/submit`, {
      method: 'POST',
      json: {
        name: 'Smoke Test',
        phone: '+7(911)-300-35-03',
        answers: {},
        consentAccepted: true,
      },
    });
    log(
      'Квиз POST submit',
      res.ok && data?.success,
      res.ok ? `id=${data?.id}` : JSON.stringify(data?.message || data),
    );
  }

  // Форма обратного звонка
  {
    const { res, data } = await request('/forms/callback', {
      method: 'POST',
      json: {
        name: 'Smoke Test',
        phone: '+79113003503',
        preferredTime: '10:00-12:00',
        consentAccepted: true,
      },
    });
    log(
      'Форма POST /forms/callback',
      res.ok,
      res.ok ? 'ok' : JSON.stringify(data?.message || data),
    );
  }

  // Форма без Origin в production была бы заблокирована; в dev без Origin — ok
  {
    const url = `${API}/forms/callback`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'No Origin',
        phone: '+79113003504',
        preferredTime: '12:00',
        consentAccepted: true,
      }),
    });
    const allowedInDev = process.env.NODE_ENV !== 'production';
    log(
      'Форма без Origin (dev ожидается pass)',
      allowedInDev ? res.ok : res.status === 403,
      `status ${res.status}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Итого: ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    console.error('Провалено:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
