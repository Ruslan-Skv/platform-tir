'use client';

import styles from './OrderCheckoutInfoPage.module.css';

const PRODUCT_STATUS_FLOW = [
  'PENDING_REVIEW — заказ отправлен на проверку менеджеру.',
  'RETURNED_FOR_CORRECTION — заказ отправлен на доработку покупателю.',
  'APPROVED — заказ проверен, окно оформления 60 минут.',
  'PENDING / PROCESSING — обработка на складе или у менеджера.',
  'SHIPPED / DELIVERED — заказ отправлен и доставлен.',
  'CANCELLED / REFUNDED — отмена или возврат.',
];

const SERVICE_STATUS_FLOW = [
  'PENDING — ожидает обработки менеджером.',
  'CONFIRMED — подтвержден менеджером.',
  'CANCELLED — отменен.',
];

export function OrderCheckoutInfoPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Порядок оформления заказов</h1>
        <p className={styles.subtitle}>
          Раздел фиксирует текущую логику оформления заказов в приложении: товары, комплектующие и
          услуги из каталога. Описание основано на действующем поведении корзины, заказов и админки.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Источники заказа</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>Каталог товаров: товары и комплектующие добавляются в корзину.</li>
            <li>
              Каталог услуг: расчеты по помещениям добавляются в корзину как одна позиция на
              категорию услуг (стоимость считается по составу работ).
            </li>
            <li>
              Заказ создается из корзины и отправляется на проверку менеджеру (статус{' '}
              <span className={styles.inlineCode}>PENDING_REVIEW</span>).
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Схемы оформления заказа</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>
              <strong>Покупатель оформляет сам</strong> — наполняет корзину, отправляет на проверку
              менеджеру, после проверки получает доступ к оформлению (страница{' '}
              <span className={styles.inlineCode}>/checkout?orderId=...</span>).
            </li>
            <li>
              <strong>Менеджер оформляет в интересах покупателя</strong> — работает с заказом в
              админке: проверяет состав, вносит данные покупателя, может отправить заказ на email
              покупателю и отправить на доработку при необходимости.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Основной сценарий (товары + услуги)</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>Пользователь наполняет корзину товарами, комплектующими и услугами.</li>
            <li>При необходимости указывает доставку и параметры подъема (этаж/лифт).</li>
            <li>Нажимает «Отправить на проверку» — корзина превращается в заказ на проверке.</li>
            <li>
              Менеджер в админке проверяет состав, может добавить комментарии и изменить
              позиции/доставку.
            </li>
            <li>
              После проверки менеджер переводит заказ в статус{' '}
              <span className={styles.inlineCode}>APPROVED</span> или отправляет на доработку (
              <span className={styles.inlineCode}>RETURNED_FOR_CORRECTION</span>).
            </li>
          </ul>
        </div>
        <div className={styles.note} style={{ marginTop: 12 }}>
          После статуса <strong>APPROVED</strong> действует окно оформления 60 минут. Если время
          истекло, заказ снова требует проверки.
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Порядок оформления доставки</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>
              Доставка заполняется в корзине до отправки на проверку: город и улица обязательны, тип
              доставки — <span className={styles.inlineCode}>TO_ENTRANCE</span> или{' '}
              <span className={styles.inlineCode}>TO_APARTMENT</span>.
            </li>
            <li>
              При доставке до квартиры дополнительно указываются этаж и наличие лифта. Можно указать
              желаемое время доставки.
            </li>
            <li>
              Стоимость доставки рассчитывается через{' '}
              <span className={styles.inlineCode}>/orders/calculate-delivery</span> и сохраняется в
              заказе (доставка + подъём/грузчики).
            </li>
            <li>
              Режим оплаты доставки берется из настроек и отображается в заказе (например,{' '}
              <span className={styles.inlineCode}>ON_SITE</span> — «Оплатить водителю»).
            </li>
            <li>
              После проверки стоимость доставки показывается на странице оформления и в публичном
              просмотре заказа.
            </li>
          </ul>
        </div>
        <div className={styles.note} style={{ marginTop: 12 }}>
          Если доставка не выбрана, заказ отправляется на проверку без адреса и расчёта доставки.
          Менеджер может добавить/изменить доставку в админке.
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Варианты и развилки</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>
              <span className={styles.badge}>Заказ на проверке уже существует</span> — при отправке
              новых позиций система предлагает объединить их с текущим заказом на проверке (
              <span className={styles.inlineCode}>addToPendingReview</span>).
            </li>
            <li>
              <span className={styles.badge}>Есть проверенный заказ</span> — если заказ в статусе{' '}
              <span className={styles.inlineCode}>APPROVED</span> и время не истекло, новые позиции
              можно добавить к нему (подтверждение{' '}
              <span className={styles.inlineCode}>addToApproved</span>). Изменение состава может
              отменить текущий «проверенный» заказ.
            </li>
            <li>
              <span className={styles.badge}>Заказ на доработке</span> — позиции из секции «На
              доработке» и новые позиции отправляются на повторную проверку одним действием.
            </li>
            <li>
              <span className={styles.badge}>Отмена проверки</span> — покупатель может отменить
              заказ на проверке, после чего он становится{' '}
              <span className={styles.inlineCode}>CANCELLED</span>.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Статусы заказов</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <p className={styles.statusTitle}>Заказы товаров/услуг из корзины</p>
            <ul className={styles.statusList}>
              {PRODUCT_STATUS_FLOW.map((status) => (
                <li key={status}>{status}</li>
              ))}
            </ul>
          </div>
          <div className={styles.statusCard}>
            <p className={styles.statusTitle}>Отдельные заказы на услуги</p>
            <ul className={styles.statusList}>
              {SERVICE_STATUS_FLOW.map((status) => (
                <li key={status}>{status}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.note} style={{ marginTop: 12 }}>
          Отдельные заказы на услуги отображаются в админке как «Заказы на услуги». В них
          заполняются данные покупателя, после чего заказ подтверждается или отменяется менеджером.
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Тексты модальных подтверждений</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>
              <strong>Изменение состава заказа</strong> (при правках корзины, если есть проверенный
              заказ):
              <br />
              «Завершите оформление заказа. При изменении состава заказа производится полное
              переоформление заказа. При этом все незавершённые заказы будут отменены! Продолжить?»
              (кнопки: «Нет», «Да»).
            </li>
            <li>
              <strong>Добавить товары к проверенному заказу?</strong>
              <br />
              «У вас уже есть проверенный заказ. При отправке новых товаров и услуг на проверку они
              будут добавлены к вашему проверенному заказу, и заказ снова отправится на проверку
              менеджеру.»
              <br />
              Подсказка: «После проверки вы сможете оформить и оплатить весь заказ целиком.»
              (кнопки: «Отмена», «Да, добавить к заказу»).
            </li>
            <li>
              <strong>Обновить заказ на проверке?</strong>
              <br />
              «У вас уже есть заказ на проверке. При отправке новых товаров и услуг они добавятся к
              этому заказу, и проверка запустится заново с обновлённым списком товаров и услуг.»
              <br />
              Подсказка: «Менеджер увидит объединённый заказ и проверит его заново.» (кнопки:
              «Отмена», «Да, обновить заказ»).
            </li>
            <li>
              <strong>Удалить расчёт из корзины?</strong> (каталог услуг):
              <br />
              «Любые изменения расчёта (включая добавление помещения) удалят его из корзины. После
              редактирования можно снова отправить в корзину.» (кнопки: «Отмена», «Удалить и
              продолжить»).
            </li>
            <li>
              <strong>Отправить заказ на доработку</strong> (админка):
              <br />
              «Покупатель получит уведомление и сможет внести правки. Укажите общий комментарий
              (опционально):» + плейсхолдер «Например: уточните, пожалуйста, размер двери и адрес
              доставки» (кнопки: «Отмена», «Отправить»).
            </li>
            <li>
              <strong>Отменить заказ</strong> (админка):
              <br />
              «Отменить заказ …? Покупатель сможет оформить заказ заново из корзины.» (кнопки:
              «Нет», «Да, отменить заказ»).
            </li>
            <li>
              <strong>Удалить заказ</strong> (админка):
              <br />
              «Удалить заказ …? Это действие нельзя отменить.» (кнопки: «Отмена», «Удалить»).
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Схема оформления</h2>
        <pre className={styles.diagram}>
          {`Каталог товаров / каталог услуг
          │
          ▼
        Корзина
   (товары + услуги)
          │
          ▼
Отправить на проверку
          │
          ├─ Есть APPROVED (<= 60 мин)?
          │        ├─ Да → подтвердить добавление → addToApproved
          │        └─ Нет
          │
          ├─ Есть PENDING_REVIEW?
          │        ├─ Да → подтвердить объединение → addToPendingReview
          │        └─ Нет → создать новый заказ (PENDING_REVIEW)
          │
          ▼
    Проверка менеджером
          │
          ├─ APPROVED → ссылка на оформление /checkout?orderId=...
          │        │
          │        └─ Окно 60 минут → PROCESSING/SHIPPED/DELIVERED
          │
          ├─ RETURNED_FOR_CORRECTION → правки в корзине → повторная проверка
          │
          └─ CANCELLED / REFUNDED`}
        </pre>
      </section>
    </div>
  );
}
