'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { formatContractDateRuLong } from '../../../../core/contractDateFormat';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type {
  PackageFormData,
  PackagePostWorkQuestionnaire2Block,
  PostWorkSatisfactionRating,
} from '../../form/packageForm';
import { POST_WORK_QUESTIONNAIRE2_TRADE_ROWS } from '../../form/packageForm';
import styles from './PackageQuestionnairesHubPanels.module.css';
import {
  Q_FIELD,
  Q_HEAD,
  Q_HINT,
  Q_PANEL,
  Q_PANEL_HEAD,
  Q_PANEL_TITLE,
  Q_TITLE,
} from './managerQuestionnairePanelStyles';

const SCALE = [5, 4, 3, 2, 1] as const;

const MASTERS_RATING_QUESTION = 'Оцените пожалуйста работу наших мастеров:';

export type PackagePostWorkQuestionnaire2TabProps = {
  form: PackageFormData;
  packageKind?: ContractDocumentPackageKind;
  onPatch: (patch: Partial<PackagePostWorkQuestionnaire2Block>) => void;
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
    <div className={styles.ratingRow}>
      <p className={styles.ratingQuestion}>{label}</p>
      <div className={styles.ratingScale} role="radiogroup" aria-label={label}>
        {SCALE.map((n) => (
          <label key={n} className={styles.ratingOption}>
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
        <label className={styles.ratingOption}>
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

/** Содержимое анкеты «Оценки после работ»: шапка, оценки, пожелания, дата и подпись. */
export function PackagePostWorkQuestionnaire2Tab({
  form,
  packageKind,
  onPatch,
}: PackagePostWorkQuestionnaire2TabProps) {
  const q = form.postWorkQuestionnaire2;
  const { contract } = form;
  const isProductDirectionPackage = isProductDirectionPackageKind(packageKind);

  return (
    <>
      <div className={Q_HEAD}>
        <h3 className={Q_TITLE}>Анкета (оценки после работ)</h3>
        <div className={Q_HINT}>
          <strong>к договору №</strong> {contract.number.trim() || '—'} <strong>от</strong>{' '}
          {formatContractDateRuLong(contract.date)}
        </div>
      </div>

      <div className={Q_PANEL}>
        <RatingRow
          name="pw2_company"
          label="1. Оцените пожалуйста работу нашей компании:"
          value={q.ratingCompany}
          onChange={(v) => onPatch({ ratingCompany: v })}
        />
        <RatingRow
          name="pw2_manager"
          label="2. Оцените пожалуйста работу нашего менеджера:"
          value={q.ratingManager}
          onChange={(v) => onPatch({ ratingManager: v })}
        />
        <RatingRow
          name="pw2_foreman"
          label="3. Оцените пожалуйста работу нашего бригадира:"
          value={q.ratingForeman}
          onChange={(v) => onPatch({ ratingForeman: v })}
        />
        {isProductDirectionPackage ? (
          <RatingRow
            name="pw2_masters"
            label={`4. ${MASTERS_RATING_QUESTION}`}
            value={q.ratingMasters}
            onChange={(v) => onPatch({ ratingMasters: v })}
          />
        ) : (
          <>
            <p className={styles.ratingGroupTitle}>4. {MASTERS_RATING_QUESTION}</p>
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
          </>
        )}
      </div>

      <div className={Q_PANEL}>
        <div className={Q_PANEL_HEAD}>
          <h4 className={Q_PANEL_TITLE}>5. Ваши пожелания</h4>
        </div>
        <div className={Q_FIELD}>
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

      <div className={Q_PANEL}>
        <div className={Q_PANEL_HEAD}>
          <h4 className={Q_PANEL_TITLE}>Дата и подпись</h4>
        </div>
        <div className={styles.signFieldsRow}>
          <div className={Q_FIELD}>
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
          <div className={Q_FIELD}>
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
    </>
  );
}
