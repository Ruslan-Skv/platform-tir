'use client';

import React, { useCallback, useLayoutEffect, useState } from 'react';

import Link from 'next/link';

import type { CartAuthRequiredReason } from '@/shared/lib/cart-auth-required';
import { subscribeCartAuthRequired } from '@/shared/lib/cart-auth-required';
import { Modal } from '@/shared/ui/Modal';

import styles from './CartAuthRequiredModal.module.css';

const MODAL_TITLE = 'Войдите в личный кабинет, чтобы добавить товар в корзину';

const LEAD_BY_REASON: Record<CartAuthRequiredReason, string> = {
  add_product:
    'Корзина и оформление заказа доступны после входа в личный кабинет. Это займёт всего минуту.',
  add_component: 'Сохранение комплектующих в корзине доступно авторизованным пользователям.',
  add_service:
    'Расчёт услуг можно сохранить в корзине после входа в аккаунт — так вы не потеряете подбор.',
};

export function CartAuthRequiredModalHost() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CartAuthRequiredReason>('add_product');

  useLayoutEffect(() => {
    return subscribeCartAuthRequired((r) => {
      setReason(r);
      setOpen(true);
    });
  }, []);

  const onClose = useCallback(() => setOpen(false), []);

  const lead = LEAD_BY_REASON[reason];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={MODAL_TITLE}
      size="sm"
      className={styles.cartModalPanel}
      titleClassName={styles.cartModalTitle}
    >
      <div className={styles.wrap}>
        <p className={styles.lead}>{lead}</p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryLink} onClick={onClose}>
            Войти в аккаунт
          </Link>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Позже
          </button>
        </div>
        <p className={styles.hint}>
          Нет аккаунта?{' '}
          <Link href="/login" className={styles.hintLink} onClick={onClose}>
            Перейдите на страницу входа
          </Link>
          {' — там можно и зарегистрироваться.'}
        </p>
      </div>
    </Modal>
  );
}
