import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { formatContractDateRuLong } from '../../../core/contractDateFormat';
import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import type { PackageFormData, PostWorkSatisfactionRating } from '../form/packageForm';
import { POST_WORK_QUESTIONNAIRE2_TRADE_ROWS } from '../form/packageForm';

const MASTERS_RATING_QUESTION = 'Оцените пожалуйста работу наших мастеров по пятибалльной шкале:';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ratingCell(rating: PostWorkSatisfactionRating, value: 1 | 2 | 3 | 4 | 5): string {
  const mark = rating === value ? '✓' : '';
  return `<td style="border:1px solid #94a3b8;padding:6px 10px;text-align:center;width:42px;">${mark}</td>`;
}

function ratingHeader(): string {
  return [5, 4, 3, 2, 1]
    .map(
      (n) =>
        `<th style="border:1px solid #94a3b8;padding:6px 8px;text-align:center;width:42px;">${n}</th>`
    )
    .join('');
}

/** HTML для предпросмотра и печати вкладки «Анкета 2». */
export function buildPostWorkQuestionnaire2PrintHtml(
  form: PackageFormData,
  options?: { packageKind?: ContractDocumentPackageKind }
): string {
  const { contract, postWorkQuestionnaire2: q } = form;
  const isProductDirectionPackage = isProductDirectionPackageKind(options?.packageKind);
  const contractNo = escapeHtml(contract.number.trim() || '_______');
  const contractDate = escapeHtml(formatContractDateRuLong(contract.date));

  const rowSimple = (num: number, text: string, rating: PostWorkSatisfactionRating) => `
<tr>
  <td colspan="2" style="border:1px solid #94a3b8;padding:8px 10px;vertical-align:middle;">${num}. ${text}</td>
  ${ratingCell(rating, 5)}
  ${ratingCell(rating, 4)}
  ${ratingCell(rating, 3)}
  ${ratingCell(rating, 2)}
  ${ratingCell(rating, 1)}
</tr>`;

  const question4Rows = isProductDirectionPackage
    ? rowSimple(4, MASTERS_RATING_QUESTION, q.ratingMasters)
    : `
<tr>
  <td style="border:1px solid #94a3b8;padding:8px 10px;" colspan="7">4. ${MASTERS_RATING_QUESTION}</td>
</tr>
${POST_WORK_QUESTIONNAIRE2_TRADE_ROWS.map(
  ({ key, label }) => `
<tr>
  <td style="border:1px solid #94a3b8;padding:6px 10px;" colspan="2">${escapeHtml(label)}</td>
  ${ratingCell(q.ratingTrades[key], 5)}
  ${ratingCell(q.ratingTrades[key], 4)}
  ${ratingCell(q.ratingTrades[key], 3)}
  ${ratingCell(q.ratingTrades[key], 2)}
  ${ratingCell(q.ratingTrades[key], 1)}
</tr>`
).join('')}`;

  const wishes = q.wishes.trim()
    ? escapeHtml(q.wishes).replace(/\n/g, '<br/>')
    : '<span style="color:#94a3b8;">—</span>';
  const filled = q.filledDate.trim() ? escapeHtml(q.filledDate.trim()) : '________';
  const signatory = q.customerSignatory.trim()
    ? escapeHtml(q.customerSignatory.trim())
    : '________';

  return `
<div class="docPrint packageQuestionnairePrint">
  <h1 style="text-align:center;margin:0 0 16pt;font-size:16pt;">АНКЕТА</h1>
  <p style="text-align:center;margin:0 0 20pt;font-size:11pt;">к договору № ${contractNo} от ${contractDate}</p>

  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin:0 0 16pt;">
    <thead>
      <tr>
        <th style="border:1px solid #94a3b8;padding:8px 10px;text-align:left;" colspan="2"></th>
        ${ratingHeader()}
      </tr>
    </thead>
    <tbody>
      ${rowSimple(
        1,
        'Оцените пожалуйста работу нашей компании по пятибалльной шкале:',
        q.ratingCompany
      )}
      ${rowSimple(
        2,
        'Оцените пожалуйста работу нашего менеджера по пятибалльной шкале:',
        q.ratingManager
      )}
      ${rowSimple(
        3,
        'Оцените пожалуйста работу нашего бригадира по пятибалльной шкале:',
        q.ratingForeman
      )}
      ${question4Rows}
    </tbody>
  </table>

  <p style="margin:0 0 6pt;">5. Ваши пожелания</p>
  <div style="min-height:72pt;border:1px solid #94a3b8;padding:10px;margin:0 0 24pt;">${wishes}</div>

  <table style="width:100%;border-collapse:collapse;font-size:10pt;margin:0 0 16pt;">
    <tr>
      <td style="padding:8px 0;vertical-align:bottom;">«${filled}»</td>
      <td style="padding:8px 0;text-align:right;vertical-align:bottom;">Ваша подпись: ${signatory}</td>
    </tr>
  </table>

  <p style="text-align:center;margin:0;font-size:12pt;">БОЛЬШОЕ СПАСИБО!</p>
</div>
`.trim();
}
