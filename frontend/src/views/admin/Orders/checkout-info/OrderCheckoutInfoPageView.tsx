'use client';

import Link from 'next/link';

import styles from './OrderCheckoutInfoPage.module.css';
import {
  CHECKOUT_FLOW_DIAGRAM,
  PRODUCT_STATUS_FLOW,
  SERVICE_STATUS_FLOW,
} from './order-checkout-info-page.constants';

export function OrderCheckoutInfoPageView() {
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
              Ремонт квартир: расчеты по помещениям добавляются в корзину как одна позиция на
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
              менеджеру, после одобрения нажимает «Оформить заказ» и переходит на страницу{' '}
              <span className={styles.inlineCode}>/checkout?orderId=...</span>, где указывает адрес
              доставки и способ оплаты. Доступ к оформлению ограничен окном времени (настраивается в{' '}
              <Link href="/admin/settings/checkout" className={styles.link}>
                Настройки → Оформление заказов
              </Link>
              ).
            </li>
            <li>
              <strong>Менеджер оформляет в интересах покупателя</strong> — работает с заказом в
              админке: проверяет состав, вносит данные покупателя (Email, ФИО, телефон), при
              необходимости меняет позиции и доставку. Отправляет заказ на email покупателю — тот
              получает ссылку на просмотр заказа (
              <span className={styles.inlineCode}>/order/view?token=...</span>) и может войти в
              личный кабинет для оформления или связаться с менеджером. Менеджер может отправить
              заказ на доработку, если нужны правки.
            </li>
            <li>
              <strong>Менеджер из корзины</strong> — если менеджер оформляет заказ «по телефону» и
              заказ уже проверен, в корзине под кнопкой «Оформить заказ» появляется ссылка
              «Отправить заказ на email клиенту». В модалке заполняются Email, ФИО, телефон — письмо
              уходит покупателю, он оформляет по ссылке из письма (см. раздел 4).
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
          После статуса <strong>APPROVED</strong> действует окно оформления (настраивается в{' '}
          <Link href="/admin/settings/checkout" className={styles.link}>
            Настройки → Оформление заказов
          </Link>
          , по умолчанию 60 минут). Если время истекло, заказ отменяется, товары и услуги остаются в
          корзине.
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Просмотр заказа и отправка на email клиента</h2>
        <div className={styles.card}>
          <ul className={styles.list}>
            <li>
              Страница просмотра заказа по ссылке из письма:{' '}
              <span className={styles.inlineCode}>/order/view?token=...</span>
            </li>
            <li>
              <strong>Отправка заказа на email</strong> доступна только менеджерам (роли задаются в{' '}
              <Link href="/admin/settings/delivery" className={styles.link}>
                Настройки → Доставка → Оформление заказов для клиентов
              </Link>
              ). Три способа:
            </li>
            <li style={{ marginTop: 8, listStyle: 'none', paddingLeft: 0 }}>
              — <strong>Админка, страница заказа</strong>: блок «Клиент» (Email, ФИО, телефон) +
              кнопка «Отправить на email покупателя». Используются данные из формы.
            </li>
            <li style={{ listStyle: 'none', paddingLeft: 0 }}>
              — <strong>Корзина</strong>: когда заказ в статусе{' '}
              <span className={styles.inlineCode}>APPROVED</span> и время оформления не истекло, под
              кнопкой «Оформить заказ» появляется ссылка «Отправить заказ на email клиенту». Клик
              открывает модалку с полями Email (обязательное), Телефон, Фамилия, Имя, Отчество.
              Перед отправкой данные покупателя сохраняются в заказе.
            </li>
            <li style={{ listStyle: 'none', paddingLeft: 0 }}>
              — <strong>Страница просмотра заказа</strong> (
              <span className={styles.inlineCode}>/order/view?token=...</span>): для менеджеров при
              статусе <span className={styles.inlineCode}>APPROVED</span> и активном таймере —
              кнопка «Отправить заказ на email клиенту» для повторной отправки на тот же email (без
              формы).
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Порядок оформления доставки</h2>
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
        <h2 className={styles.sectionTitle}>6. Варианты и развилки</h2>
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
        <h2 className={styles.sectionTitle}>7. Статусы заказов</h2>
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
        <h2 className={styles.sectionTitle}>8. Тексты модальных подтверждений</h2>
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
              <strong>Удалить расчёт из корзины?</strong> (ремонт квартир):
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
              <strong>Отправить заказ на email клиенту</strong> (корзина, для менеджеров):
              <br />
              «Отправить заказ на email клиенту» — заголовок. Описание: «Заполните данные
              покупателя. На указанный email будет отправлена ссылка на просмотр и оформление
              заказа.» Форма: Email (обязательное), Телефон, Фамилия, Имя, Отчество. Кнопки:
              «Отмена», «Отправить на email».
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
        <h2 className={styles.sectionTitle}>9. Схема оформления</h2>
        <pre className={styles.diagram}>{CHECKOUT_FLOW_DIAGRAM}</pre>
      </section>
    </div>
  );
}
