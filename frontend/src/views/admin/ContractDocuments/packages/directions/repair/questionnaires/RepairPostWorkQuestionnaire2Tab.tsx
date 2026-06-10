'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { formatContractDateRuLong } from '../../../../shared/contractDateFormat';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdInteractiveEstimate from '../../../../styles/interactive-estimate.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import cdWindows from '../../../../styles/windows-package.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type {
  PostWorkSatisfactionRating,
  RepairPackageFormData,
  RepairPostWorkQuestionnaire2Block,
} from '../repairPackageForm';
import { POST_WORK_QUESTIONNAIRE2_TRADE_ROWS } from '../repairPackageForm';

const Q_FORM_GRID = `${cdDataTab.formGrid} ${cdWindows.formGrid}`;
const Q_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const Q_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
const Q_SECTION_TITLE = cdEstimateTab.sectionTitle;
const Q_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const Q_FIELD = `${cdDataTab.field} ${cdEstimateTab.field}`;

const SCALE = [5, 4, 3, 2, 1] as const;

const MASTERS_RATING_QUESTION = 'Оцените пожалуйста работу наших мастеров:';

type Props = {
  form: RepairPackageFormData;
  packageKind?: ContractDocumentPackageKind;
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
    <div className={cdInteractiveEstimate.postWorkQ2RatingRow}>
      <p className={cdInteractiveEstimate.postWorkQ2RatingQuestion}>{label}</p>
      <div
        className={cdInteractiveEstimate.postWorkQ2RatingScale}
        role="radiogroup"
        aria-label={label}
      >
        {SCALE.map((n) => (
          <label key={n} className={cdInteractiveEstimate.postWorkQ2RatingOption}>
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
        <label className={cdInteractiveEstimate.postWorkQ2RatingOption}>
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

function RepairPostWorkQuestionnaire2Tab({ form, packageKind, onPatch }: Props) {
  const q = form.postWorkQuestionnaire2;
  const { contract } = form;
  const isProductDirectionPackage = isProductDirectionPackageKind(packageKind);

  return (
    <div className={Q_FORM_GRID}>
      <div
        className={`${Q_SECTION_CARD} ${cdEstimateTab.fieldSpanAll} ${cdInteractiveEstimate.postWorkQ2Header}`}
      >
        <h3 className={Q_SECTION_TITLE}>Анкета (оценки после работ)</h3>
        <p className={Q_HINT}>
          <strong>к договору №</strong> {contract.number.trim() || '—'} <strong>от</strong>{' '}
          {formatContractDateRuLong(contract.date)}
        </p>
      </div>

      <div className={`${Q_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        {/* <h4 className={Q_SECTION_TITLE}>Оценки по пятибалльной шкале</h4> */}
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
            <p
              className={cdInteractiveEstimate.postWorkQ2RatingQuestion}
              style={{
                marginTop: 12,
                marginBottom: 4,
                borderTop: '1px solid var(--admin-border)',
                paddingTop: 12,
              }}
            >
              4. {MASTERS_RATING_QUESTION}
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
          </>
        )}
      </div>

      <div className={`${Q_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={Q_SECTION_TITLE}>5. Ваши пожелания</h4>
        <div className={Q_SECTION_FIELDS}>
          <div className={`${Q_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
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

      <div className={`${Q_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
        <h4 className={Q_SECTION_TITLE}>Дата и подпись</h4>
        <div className={Q_SECTION_FIELDS}>
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
    </div>
  );
}

export { RepairPostWorkQuestionnaire2Tab };
