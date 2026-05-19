import fs from 'fs';

const path = 'src/views/admin/CRM/Measurements/MeasurementFormPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const actionsOld = `              <div className={styles.customerCrmActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setAddCrmCustomerOpen(true)}
                >
                  Добавить заказчика в базу
                </button>
                {customerId ? (
                  <span className={styles.customerCrmLinkedBadge}>Выбрана карточка заказчика</span>
                ) : null}
              </div>
            </div>
          </motion>

          <motion>
            <motion>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerName">`;

const actionsNeu = `              <motion>
                <motion>
              <div className={styles.customerCrmActions}>
                <button
                  type="button"
                  className={styles.customerCrmAddButton}
                  onClick={() => setAddCrmCustomerOpen(true)}
                >
                  + Добавить заказчика в базу
                </button>
              </motion>
            </article>

            <div className={styles.blankCustomerGrid}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerName">`;

// Fix - use actual </motion> tags
const actionsOld2 = `              <div className={styles.customerCrmActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setAddCrmCustomerOpen(true)}
                >
                  Добавить заказчика в базу
                </button>
                {customerId ? (
                  <span className={styles.customerCrmLinkedBadge}>Выбрана карточка заказчика</span>
                ) : null}
              </motion>
            </motion>
          </motion>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerName">`;

const actionsNeu2 = `              <div className={styles.customerCrmActions}>
                <button
                  type="button"
                  className={styles.customerCrmAddButton}
                  onClick={() => setAddCrmCustomerOpen(true)}
                >
                  + Добавить заказчика в базу
                </button>
              </motion>
            </article>

            <div className={styles.blankCustomerGrid}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerName">`;

if (!s.includes(actionsOld2)) {
  console.error('actionsOld2 not found');
  process.exit(1);
}
s = s.replace(actionsOld2, actionsNeu2);

const oldEnd = `        </motion>

        <div className={\`\${styles.row} \${styles.zoneCommentMain}\`}>`;
const neuEnd = `            </motion>

        <div className={\`\${styles.row} \${styles.blankCommentRow}\`}>`;

if (!s.includes(oldEnd)) {
  console.error('block2 not found');
  process.exit(1);
}
s = s.replace(oldEnd, neuEnd);

s = s.replace('rows={3}', 'rows={2}');
if (!s.includes('          </motion>\n        </section>')) {
  s = s.replace(
    '        </motion>\n        </section>\n\n        <section className={styles.measurementsSection}>',
    '        </motion>\n          </motion>\n        </section>\n\n        <section className={styles.measurementsSection}>'
  );
}

s = s.replace(
  'className={styles.secondaryButton}\n                    onClick={clearCrmCustomerSelection}',
  'className={styles.customerCrmClearButton}\n                    onClick={clearCrmCustomerSelection}'
);
s = s.replace('Снять выбор карточки', 'Снять выбор');

fs.writeFileSync(path, s);
console.log('ok');
