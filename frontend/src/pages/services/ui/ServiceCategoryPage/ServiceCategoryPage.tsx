'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import styles from './ServiceCategoryPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  items: ServiceCatalogItem[];
  showPricesInPublic: boolean;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' ₽';

interface CalculatorLine {
  itemId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

interface CalculateResult {
  total: number;
  lines: {
    itemId: string;
    name: string;
    categoryName: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  showPricesInPublic: boolean;
}

export function ServiceCategoryPage({ slug }: { slug: string }) {
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calcLines, setCalcLines] = useState<CalculatorLine[]>([]);
  const [calcResult, setCalcResult] = useState<CalculateResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/service-catalog/categories/${slug}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const addToCalculator = (item: ServiceCatalogItem) => {
    if (item.price === undefined) return;
    const existing = calcLines.find((l) => l.itemId === item.id);
    if (existing) {
      setCalcLines((prev) =>
        prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      );
    } else {
      setCalcLines((prev) => [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          price: item.price!,
          quantity: 1,
        },
      ]);
    }
    setCalcResult(null);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCalcLines((prev) => prev.filter((l) => l.itemId !== itemId));
    } else {
      setCalcLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)));
    }
    setCalcResult(null);
  };

  const removeFromCalculator = (itemId: string) => {
    setCalcLines((prev) => prev.filter((l) => l.itemId !== itemId));
    setCalcResult(null);
  };

  const calculate = async () => {
    if (calcLines.length === 0) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await fetch(`${API_URL}/service-catalog/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: calcLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCalcResult(result);
      }
    } catch {
      /* error */
    } finally {
      setCalcLoading(false);
    }
  };

  const showPrices = data?.showPricesInPublic ?? true;

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Категория не найдена</h1>
        <Link href="/catalog/services" className={styles.backLink}>
          ← Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/catalog/services">Каталог услуг</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{data.name}</span>
      </nav>

      <h1 className={styles.title}>{data.name}</h1>
      {data.description && <p className={styles.description}>{data.description}</p>}

      <div className={styles.content}>
        <section className={styles.itemsSection}>
          <h2 className={styles.sectionTitle}>Виды работ</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                {showPrices && (
                  <>
                    <th>Цена за ед.</th>
                    <th>Ед. изм.</th>
                    <th></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  {showPrices && (
                    <>
                      <td>{item.price !== undefined ? formatPrice(item.price) : '—'}</td>
                      <td>{item.unit}</td>
                      <td>
                        {item.price !== undefined && (
                          <button
                            type="button"
                            className={styles.addButton}
                            onClick={() => addToCalculator(item)}
                          >
                            В расчёт
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {showPrices && (
          <aside className={styles.calculator}>
            <h2 className={styles.sectionTitle}>Расчёт стоимости</h2>
            {calcLines.length === 0 ? (
              <p className={styles.calcEmpty}>
                Добавьте виды работ из таблицы, укажите количество и нажмите «Рассчитать».
              </p>
            ) : (
              <>
                <ul className={styles.calcList}>
                  {calcLines.map((line) => (
                    <li key={line.itemId} className={styles.calcLine}>
                      <div className={styles.calcLineInfo}>
                        <span className={styles.calcLineName}>{line.name}</span>
                        <span className={styles.calcLinePrice}>
                          {formatPrice(line.price)} / {line.unit}
                        </span>
                      </div>
                      <div className={styles.calcLineControls}>
                        <input
                          type="number"
                          min={0.01}
                          step={0.1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateQuantity(line.itemId, parseFloat(e.target.value) || 0)
                          }
                          className={styles.quantityInput}
                        />
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeFromCalculator(line.itemId)}
                          title="Убрать"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={styles.calcButton}
                  onClick={calculate}
                  disabled={calcLoading}
                >
                  {calcLoading ? 'Расчёт...' : 'Рассчитать стоимость'}
                </button>
                {calcResult && (
                  <div className={styles.calcResult}>
                    <div className={styles.calcTotal}>
                      Итого: <strong>{formatPrice(calcResult.total)}</strong>
                    </div>
                    {calcResult.lines.length > 0 && (
                      <ul className={styles.calcResultLines}>
                        {calcResult.lines.map((l, i) => (
                          <li key={i} className={styles.calcResultLine}>
                            {l.name} — {l.quantity} {l.unit} × {formatPrice(l.price)} ={' '}
                            {formatPrice(l.amount)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
