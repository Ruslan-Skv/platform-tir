/** Резервный HTML счёта на оплату (формат как в 1С / СберБизнес). */
const INV_BORDER = 'border:1px solid #000;';
const INV_CELL = `${INV_BORDER} padding:3px 5px; font-size:10pt; vertical-align:top;`;
const INV_TH = `${INV_CELL} font-weight:normal; text-align:center;`;

export const packageTemplatePaymentInvoice = `
<div class="docPrint" style="font-family: Arial, Helvetica, sans-serif; font-size:10pt; color:#000;">
  <table style="width:100%; border-collapse:collapse; margin:0 0 10pt;">
    <tbody>
      <tr>
        <td style="width:26%; ${INV_CELL} border-right:none;">
          <p style="margin:0;">Банк получателя</p>
        </td>
        <td style="width:28%; ${INV_CELL} border-left:none; border-right:none;">
          <p style="margin:0; white-space:pre-wrap;">{{executor.bankName}}</p>
        </td>
        <td style="width:12%; ${INV_CELL}">БИК</td>
        <td style="width:34%; ${INV_CELL}">{{executor.bankBik}}</td>
      </tr>
      <tr>
        <td style="${INV_CELL} border-right:none; border-top:none;"></td>
        <td style="${INV_CELL} border-left:none; border-right:none; border-top:none;"></td>
        <td style="${INV_CELL}">Кор.сч. №</td>
        <td style="${INV_CELL}">{{executor.bankCorrAccount}}</td>
      </tr>
      <tr>
        <td style="${INV_CELL}">ИНН {{executor.inn}}</td>
        <td style="${INV_CELL}"></td>
        <td style="${INV_CELL}">Р/с №</td>
        <td style="${INV_CELL}">{{executor.bankSettlementAccount}}</td>
      </tr>
      <tr>
        <td style="${INV_CELL} border-right:none;">
          <p style="margin:0;">Получатель</p>
        </td>
        <td colspan="3" style="${INV_CELL} border-left:none;">
          <p style="margin:0;">{{executor.companyName}}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <p style="margin:0 0 8pt; font-size:16pt; font-weight:bold;">{{contract.invoiceTitleLine}}</p>
  <hr style="border:none; border-top:1px solid #000; margin:0 0 10pt;" />

  <p style="margin:0 0 6pt; font-size:10pt;">
    <span style="display:inline-block; min-width:95px;">Поставщик:</span>
    <span>{{executor.supplierLine}}</span>
  </p>
  <p style="margin:0 0 6pt; font-size:10pt;">
    <span style="display:inline-block; min-width:95px;">Покупатель:</span>
    <span>{{customer.buyerLine|plain}}</span>
  </p>
  <p style="margin:0 0 12pt; font-size:10pt;">
    <span style="display:inline-block; min-width:95px;">Основание:</span>
    <span>{{contract.paymentBasis}}</span>
  </p>

  <table style="width:100%; border-collapse:collapse; margin:0 0 8pt;">
    <thead>
      <tr>
        <th style="width:4%; ${INV_TH}">№</th>
        <th style="width:45%; ${INV_TH}">Товары (работы, услуги)</th>
        <th style="width:9%; ${INV_TH}">Кол-во</th>
        <th style="width:8%; ${INV_TH}">Ед. изм.</th>
        <th style="width:10%; ${INV_TH}">НДС</th>
        <th style="width:12%; ${INV_TH}">Цена за ед.</th>
        <th style="width:12%; ${INV_TH}">Сумма</th>
      </tr>
    </thead>
    <tbody>
      {{invoice.linesHtml|html}}
    </tbody>
  </table>

  <p style="margin:0 0 4pt; text-align:right; font-size:10pt;">
    <strong>Итого:</strong>
    <span style="display:inline-block; min-width:100px; text-align:right;">{{contract.prepaymentAmountFormatted}}</span>
  </p>
  <p style="margin:0 0 4pt; font-size:10pt;">
    Всего наименований {{invoice.itemsCount}} на {{contract.prepaymentAmountFormatted}} руб.
    <span style="float:right; font-weight:bold;">Без НДС</span>
  </p>
  <table style="width:100%; border-collapse:collapse; margin:0 0 16pt;">
    <tr>
      <td style="vertical-align:top; font-size:10pt;">
        <p style="margin:0;">
          <strong>{{contract.prepaymentAmountWordsInvoice}}</strong>
        </p>
        <p style="margin:8pt 0 0;">
          <strong>Итого к оплате:</strong>
          <span style="display:inline-block; min-width:90px; text-align:right;">{{contract.prepaymentAmountFormatted}}</span>
        </p>
      </td>
      <td style="width:112px; vertical-align:top; text-align:center; padding-left:8pt;">
        {{invoice.qrCodeHtml|html}}
      </td>
    </tr>
  </table>

  <hr style="border:none; border-top:1px solid #000; margin:0 0 24pt;" />
  <p style="margin:0; text-align:right; font-size:10pt;"><strong>М. П.</strong></p>
  <p style="margin:32pt 0 0; font-size:10pt;">
     _____________________ / {{executor.directorName}}
  </p>
</div>
`.trim();
