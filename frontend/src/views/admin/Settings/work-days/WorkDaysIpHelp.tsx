'use client';

import { useCallback, useEffect, useState } from 'react';

import { getMyClientIp } from '@/shared/api/admin-work-days';

import styles from './WorkDaysIpHelp.module.css';

type WorkDaysIpHelpProps = {
  variant?: 'settings' | 'compact';
};

export function WorkDaysIpHelp({ variant = 'settings' }: WorkDaysIpHelpProps) {
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyClientIp();
      setClientIp(data.ip);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIp();
  }, [loadIp]);

  if (variant === 'compact') {
    return (
      <div className={styles.compact}>
        <span className={styles.compactLabel}>IP этого компьютера (как видит система):</span>
        <code className={styles.ipCode}>{loading ? '…' : (clientIp ?? 'не определён')}</code>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => void loadIp()}
          disabled={loading}
        >
          Обновить
        </button>
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>
    );
  }

  return (
    <aside className={styles.help}>
      <h3 className={styles.helpTitle}>Как настроить IP офиса</h3>
      <p className={styles.helpText}>
        Список указывается в этом разделе для каждого офиса в поле <strong>«Разрешённые IP»</strong>{' '}
        (вкладка «Офисы»). Можно добавить <strong>несколько адресов</strong> — по одному на строку.
      </p>
      <ul className={styles.list}>
        <li>
          Обычно в одном офисе все компьютеры выходят в интернет через{' '}
          <strong>один общий IP</strong> (роутер офиса) — тогда достаточно{' '}
          <strong>одной строки</strong>, даже если работает несколько сотрудников.
        </li>
        <li>Если у части ПК другой внешний IP — добавьте каждый адрес отдельной строкой.</li>
        <li>
          Можно указать подсеть целиком, например <code>192.168.1.0/24</code> — для локальной сети
          офиса.
        </li>
      </ul>
      <p className={styles.helpText}>
        <strong>Как узнать IP рабочего места:</strong> откройте админку с нужного компьютера в офисе
        и посмотрите значение ниже (это IP, который видит сервер при начале рабочего дня). Сотрудник
        может также увидеть свой IP на странице <strong>CRM → Мой рабочий день</strong>.
      </p>
      <div className={styles.ipBox}>
        <span>IP с этого браузера сейчас:</span>
        <code className={styles.ipCode}>
          {loading ? 'определение…' : (clientIp ?? 'не определён')}
        </code>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => void loadIp()}
          disabled={loading}
        >
          Обновить
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </aside>
  );
}
