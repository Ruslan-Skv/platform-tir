-- Одноразовый FIFO-пересчёт paidAmount для существующих ведомостей: пул оплат
-- каждого поставщика гасит самые ранние счета (дата, момент внесения, id).
-- Дальше это делает сервис при каждом изменении ведомости.

WITH ordered_invoices AS (
  SELECT
    id,
    "supplierId",
    amount,
    COALESCE(
      SUM(amount) OVER (
        PARTITION BY "supplierId"
        ORDER BY date, "createdAt", id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS cum_prev_amount
  FROM supplier_ledger_entries
  WHERE amount IS NOT NULL AND amount > 0
),
pay_totals AS (
  SELECT "supplierId", COALESCE(SUM(payment), 0) AS total_paid
  FROM supplier_ledger_entries
  GROUP BY "supplierId"
),
allocations AS (
  SELECT
    o.id,
    LEAST(o.amount, GREATEST(0, p.total_paid - o.cum_prev_amount)) AS paid_amount
  FROM ordered_invoices o
  JOIN pay_totals p ON p."supplierId" = o."supplierId"
)
UPDATE supplier_ledger_entries e
SET "paidAmount" = COALESCE(a.paid_amount, 0)
FROM allocations a
WHERE e.id = a.id;
