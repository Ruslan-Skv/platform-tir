'use client';

import styles from '../ContractDocuments.module.css';
import { formatContractDateRuLong } from './contractDateFormat';
import type {
  PostWorkSatisfactionRating,
  RepairPackageFormData,
  RepairPostWorkQuestionnaire2Block,
} from './repairPackageForm';
import { POST_WORK_QUESTIONNAIRE2_TRADE_ROWS } from './repairPackageForm';

const SCALE = [5, 4, 3, 2, 1] as const;

type Props = {
  form: RepairPackageFormData;
  onPatch: (patch: Partial<RepairPostWorkQuestionnaire2Block>) => void;
};

function RatingRow({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: PostWorkSatisfactionRating;
  onChange: (v: PostWorkSatisfactionRating) => void;
}) {
  return (
    <div className={styles.postWorkQ2RatingRow}>
      <p className={styles.postWorkQ2RatingQuestion}>{label}</p>
      <div className={styles.postWorkQ2RatingScale} role="radiogroup" aria-label={label}>
        {SCALE.map((n) => (
          <label key={n} className={styles.postWorkQ2RatingOption}>
            <input
              type="radio"
              name={name}
              value={String(n)}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span>{n}</span>
          </label>
        ))}
        <label className={styles.postWorkQ2RatingOption}>
          <input
            type="radio"
            name={name}
            value=""
            checked={value === null}
            onChange={() => onChange(null)}
          />
          <span>не оценено</span>
        </label>
      </div>
    </div>
  );
}

export function RepairPostWorkQuestionnaire2Tab({ form, onPatch }: Props) {
  const q = form.postWorkQuestionnaire2;
  const { contract } = form;

  return (
    <div className={styles.formGrid}>
      <div className={`${styles.sectionCard} ${styles.fieldSpanAll}`}>
        <h3 className={styles.sectionTitle}>Анкета (оценки после работ)</h3>
        <p className={styles.hint} style={{ marginTop: 0 }}>
          Анкета для заказчика после выполнения работ по договору. Номер и дата договора
          подставляются из вкладки «Данные»; оценки и пожелания можно внести при получении
          заполненного бланка или продиктованных оценок. Печать — кнопка «Печать».
        </p>
        <p className={styles.hint} style={{ marginBottom: 0 }}>
          <strong>к договору №</strong> {contract.number.trim() || '—'} <strong>от</strong>{' '}
          {formatContractDateRuLong(contract.date)}
        </p>
      </div>

      <div className={`${styles.sectionCard} ${styles.fieldSpanAll}`}>
        <h4 className={styles.sectionTitle}>Оценки по пятибалльной шкале</h4>
        <RatingRow
          name="pw2_company"
          label="1. Оцените пожалуйста работу нашей компании по пятибалльной шкале:"
          value={q.ratingCompany}
          onChange={(v) => onPatch({ ratingCompany: v })}
        />
        <RatingRow
          name="pw2_manager"
          label="2. Оцените пожалуйста работу нашего менеджера по пятибалльной шкале:"
          value={q.ratingManager}
          onChange={(v) => onPatch({ ratingManager: v })}
        />
        <RatingRow
          name="pw2_foreman"
          label="3. Оцените пожалуйста работу нашего бригадира по пятибалльной шкале:"
          value={q.ratingForeman}
          onChange={(v) => onPatch({ ratingForeman: v })}
        />
        <p
          className={styles.postWorkQ2RatingQuestion}
          style={{ marginTop: 12, marginBottom: 4, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}
        >
          4. Оцените пожалуйста работу наших мастеров по пятибалльной шкале:
        </p>
        {POST_WORK_QUESTIONNAIRE2_TRADE_ROWS.map(({ key, label }) => (
          <RatingRow
            key={key}
            name={`pw2_trade_${key}`}
            label={label}
            value={q.ratingTrades[key]}
            onChange={(v) =>
              onPatch({
                ratingTrades: { ...q.ratingTrades, [key]: v },
              })
            }
          />
        ))}
      </div>

      <div className={`${styles.sectionCard} ${styles.fieldSpanAll}`}>
        <h4 className={styles.sectionTitle}>5. Ваши пожелания</h4>
        <div className={styles.sectionFields}>
          <div className={`${styles.field} ${styles.fieldSpanAll}`}>
            <label htmlFor="pw2_wishes">Текст</label>
            <textarea
              id="pw2_wishes"
              rows={6}
              value={q.wishes}
              onChange={(e) => onPatch({ wishes: e.target.value })}
              placeholder="Пожелания заказчика"
            />
          </div>
        </div>
      </div>

      <div className={`${styles.sectionCard} ${styles.fieldSpanAll}`}>
        <h4 className={styles.sectionTitle}>Дата и подпись</h4>
        <div className={styles.sectionFields}>
          <div className={styles.field}>
            <label htmlFor="pw2_filled">Дата заполнения (дд.мм.гггг)</label>
            <input
              id="pw2_filled"
              type="text"
              value={q.filledDate}
              onChange={(e) => onPatch({ filledDate: e.target.value })}
              placeholder="например, 15.01.2026"
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="pw2_sign">Ваша подпись (ФИО заказчика)</label>
            <input
              id="pw2_sign"
              type="text"
              value={q.customerSignatory}
              onChange={(e) => onPatch({ customerSignatory: e.target.value })}
              placeholder="Как в анкете"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
