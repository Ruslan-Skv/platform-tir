'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';

export function formatPackageMoneyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function PackageEstimateSignaturesBlock({
  directorName,
  customerFullName,
  executorPartyLabel = 'Подрядчик',
}: {
  directorName: string;
  customerFullName: string;
  executorPartyLabel?: 'Подрядчик' | 'Исполнитель';
}) {
  return (
    <div className={cdDocPreview.estimateA4Signatures}>
      <table className={cdDocPreview.estimateA4SignaturesTable}>
        <tbody>
          <tr>
            <td className={cdDocPreview.estimateA4SignaturesCellLeft}>
              <p className={cdDocPreview.estimateA4SignaturePartyLine}>
                {executorPartyLabel} _____________________ / {directorName}
              </p>
              <p className={cdDocPreview.estimateA4SignNote}>м.п.</p>
            </td>
            <td className={cdDocPreview.estimateA4SignaturesCellRight}>
              <p className={cdDocPreview.estimateA4SignaturePartyLine}>
                Заказчик _____________________ / {customerFullName}
              </p>
              <p className={cdDocPreview.estimateA4SignNote}>подпись</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
