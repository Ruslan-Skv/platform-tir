import { buildContractAppendixRefParagraphHtml } from '../../core/typography/contractTemplateAppendixRef';

/** Шаблон «Памятка по эксплуатации натяжных потолков» (направление «Натяжные потолки», приложение №4). */
export const ceilingsTemplateMemo = `
<div class="docPrint docPrintContractCompact">
  ${buildContractAppendixRefParagraphHtml(4)}
  <h3 style="text-align: center; font-weight: normal; margin: 11pt 0 4pt; line-height: 1.32;">Памятка по эксплуатации натяжных потолков</h3>
  <p style="text-align: center; font-weight: normal; margin: 0 0 10pt; line-height: 1.32; font-size: 10pt;">(вручается Заказчику при подписании Акта приёма-передачи)</p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">Уважаемый Заказчик!</p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Чтобы Ваш натяжной потолок служил долго и сохранял безупречный вид, соблюдайте простые правила.
    Нарушение этих правил может стать основанием для отказа в гарантийном ремонте.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">1. Общие правила ухода за полотном</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Чистите полотно только сухим способом (мягкая щётка, пылесос с мягкой насадкой, микрофибра) – 1 раз в месяц.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Для ПВХ-плёнки допустима влажная чистка мягкой губкой с мыльным раствором (без абразивов), затем протирка насухо.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Для тканевого полотна – только сухая чистка (влажная может оставить разводы или нарушить пропитку).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Запрещено использовать растворители, ацетон, спирт, хлорку, абразивные средства и жёсткие щётки.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Не нажимайте на полотно – оно может деформироваться.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">2. Что делать при загрязнениях</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Пыль – удаляйте пылесосом на минимальной мощности.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Лёгкие пятна – удаляйте мыльным раствором (для ПВХ), сразу промокните насухо.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Если пятно не выводится – обратитесь к специалисту по химчистке. Не трите пятно агрессивно.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">3. Светильники и электрика</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Используйте только лампы и светильники, указанные в спецификации, с мощностью, не превышающей рекомендуемую производителем
    (обычно до 50 Вт для точечных светильников во избежание перегрева полотна).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    При замене лампочки обесточьте помещение и дайте светильнику остыть.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Не прикасайтесь к поверхности потолка рядом со светильниками руками – могут остаться следы.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    При перегреве или мигании ламп – немедленно отключите и вызовите электрика.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Не подключайте дополнительные светильники к существующей проводке без проекта – это нарушение гарантии.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">4. Чего категорически нельзя делать</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Не протыкайте полотно (острыми предметами, детскими игрушками и т.п.).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Не клейте ничего на потолок (скотч, клей, наклейки).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Не вешайте на потолок тяжёлые предметы (кроме специальных закладных, установленных до монтажа).
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Не пытайтесь самостоятельно снимать/переустанавливать светильники – это нарушает герметичность и крепление.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Не допускайте длительного воздействия прямых солнечных лучей на матовые и глянцевые плёнки – может измениться цвет.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">5. Особенности для помещений с повышенной влажностью (ванная, кухня)</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Регулярно проветривайте помещение, чтобы избежать конденсата на полотне.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Удаляйте капли воды сразу мягкой тряпкой.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Используйте только влагостойкие светильники.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">6. Что делать при обнаружении дефекта</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    Если появились складки, провисания, расхождение швов, изменение цвета – сразу свяжитесь с нами: тел. ________________.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    При неисправности светильников (не горит, мигает, перегревается) – отключите и вызовите мастера.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    Не пытайтесь чинить самостоятельно – это снимает с гарантии.
  </p>

  <h4 style="text-align: left; font-weight: bold; font-size: 11pt; margin: 12pt 0 6pt;">7. Гарантийные сроки</h4>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt;">
    На полотно и монтаж – 2 года.
  </p>
  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 10pt;">
    На светильники и электрооборудование – 6 месяцев (лампочки – расходный материал).
  </p>

  <p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 0;">
    Благодарим за доверие! Бережный уход продлит срок службы Вашего потолка до 15 лет.
  </p>
</div>
`.trim();
