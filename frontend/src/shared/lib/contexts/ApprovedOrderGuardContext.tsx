'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { CartItem } from '@/shared/api/cart';
import {
  type UserOrder,
  cancelOrderByCustomer,
  getApprovalRemainingMs,
  getUserOrders,
} from '@/shared/api/user-orders';

type PendingAction = {
  action: () => Promise<void>;
  orderId: string;
  resolve: (ok: boolean) => void;
};

interface ApprovedOrderGuardContextValue {
  hasApprovedOrder: boolean;
  approvedOrder: UserOrder | null;
  isCartItemInApprovedOrder: (item: CartItem) => boolean;
  confirmBeforeCartChange: (action: () => Promise<void>, needConfirm: boolean) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
}

const ApprovedOrderGuardContext = createContext<ApprovedOrderGuardContextValue | undefined>(
  undefined
);

const WARNING_TEXT =
  'При изменении состава заказа производится полное переоформление заказа. При этом все незавершённые заказы будут отменены! Продолжить?';

export function ApprovedOrderGuardProvider({ children }: { children: React.ReactNode }) {
  const [userOrders, setUserOrders] = useState<UserOrder[] | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [cancelInProgress, setCancelInProgress] = useState(false);

  const refreshOrders = useCallback(async () => {
    try {
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch {
      setUserOrders([]);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const approvedOrder = useMemo(() => {
    if (!userOrders?.length) return null;
    const approved = userOrders.find(
      (o) => o.status === 'APPROVED' && getApprovalRemainingMs(o.approvedAt ?? null) > 0
    );
    return approved ?? null;
  }, [userOrders]);

  const hasApprovedOrder = !!approvedOrder;

  const isCartItemInApprovedOrder = useCallback(
    (item: CartItem): boolean => {
      if (!approvedOrder?.items?.length) return false;
      const productId = item.product?.id ?? item.component?.productId ?? item.productId;
      if (!productId) return false;
      const qty = Math.round(Number(item.quantity));
      const size = item.size ?? null;
      const opening = item.openingSide ?? null;
      return approvedOrder.items.some(
        (oi) =>
          oi.productId === productId &&
          oi.quantity === qty &&
          (oi.size ?? null) === size &&
          (oi.openingSide ?? null) === opening
      );
    },
    [approvedOrder]
  );

  const confirmBeforeCartChange = useCallback(
    async (action: () => Promise<void>, needConfirm: boolean): Promise<boolean> => {
      if (!needConfirm || !approvedOrder) {
        await action();
        return true;
      }
      return new Promise<boolean>((resolve) => {
        setPending({
          action,
          orderId: approvedOrder.id,
          resolve,
        });
      });
    },
    [approvedOrder]
  );

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    setCancelInProgress(true);
    try {
      await cancelOrderByCustomer(pending.orderId);
      await refreshOrders();
      await pending.action();
      pending.resolve(true);
    } catch (err) {
      pending.resolve(false);
      if (err instanceof Error) alert(err.message);
    } finally {
      setPending(null);
      setCancelInProgress(false);
    }
  }, [pending, refreshOrders]);

  const handleCancel = useCallback(() => {
    if (pending) {
      pending.resolve(false);
      setPending(null);
    }
  }, [pending]);

  const value: ApprovedOrderGuardContextValue = useMemo(
    () => ({
      hasApprovedOrder,
      approvedOrder,
      isCartItemInApprovedOrder,
      confirmBeforeCartChange,
      refreshOrders,
    }),
    [
      hasApprovedOrder,
      approvedOrder,
      isCartItemInApprovedOrder,
      confirmBeforeCartChange,
      refreshOrders,
    ]
  );

  return (
    <ApprovedOrderGuardContext.Provider value={value}>
      {children}
      {pending && (
        <div
          className="approved-order-guard-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approved-order-guard-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div
            style={{
              background: 'var(--color-bg, #fff)',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="approved-order-guard-title"
              style={{ margin: '0 0 0.75rem 0', fontSize: '1.125rem', fontWeight: 600 }}
            >
              Изменение состава заказа
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9375rem', color: '#374151' }}>
              {WARNING_TEXT}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelInProgress}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  cursor: cancelInProgress ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={cancelInProgress}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#d90652',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: cancelInProgress ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {cancelInProgress ? 'Отмена заказа…' : 'Да'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ApprovedOrderGuardContext.Provider>
  );
}

export function useApprovedOrderGuard(): ApprovedOrderGuardContextValue {
  const ctx = useContext(ApprovedOrderGuardContext);
  if (ctx === undefined) {
    throw new Error('useApprovedOrderGuard must be used within ApprovedOrderGuardProvider');
  }
  return ctx;
}
