'use client';

import { useSyncExternalStore } from 'react';

import {
  getContractDocumentRepairSettings,
  putContractDocumentRepairSettings,
} from '@/shared/api/admin-contract-document-packages';

import { PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT } from '../hub/pipeline/packagePipeline';

/**
 * Глобальный порог оплаты для Акта начала работ по ремонту (настраивает
 * супер-админ в «Настройках договоров»). Значение нужно и хабу пакета, и списку
 * договоров, поэтому живёт в кэше на уровне модуля: один фетч за сессию,
 * после сохранения — мгновенное обновление всех подписчиков.
 */

let cachedPct: number = PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
let loadedOnce = false;
let loadPromise: Promise<number> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function clampPct(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
  const t = Math.trunc(raw);
  return t >= 1 && t <= 100 ? t : PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
}

/** Загрузка порога с сервера (один запрос за сессию, повторы после ошибок). */
export function loadWorkStartMinPayPct(): Promise<number> {
  if (loadedOnce) return Promise.resolve(cachedPct);
  if (!loadPromise) {
    loadPromise = getContractDocumentRepairSettings()
      .then((settings) => {
        cachedPct = clampPct(settings.workStartMinPayPercent);
        loadedOnce = true;
        return cachedPct;
      })
      .catch(() => {
        // Ошибка загрузки — молча используем дефолт; повторим при следующем вызове.
        return PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

/** Обновление порога после сохранения настроек (и в кэше, и на сервере). */
export function setWorkStartMinPayPct(pct: number) {
  const next = clampPct(pct);
  if (next === cachedPct) return;
  cachedPct = next;
  loadedOnce = true;
  emitChange();
}

/** Сохранение порога на сервере + обновление кэша. */
export async function saveWorkStartMinPayPct(pct: number): Promise<number> {
  const saved = await putContractDocumentRepairSettings({ workStartMinPayPercent: clampPct(pct) });
  const next = clampPct(saved.workStartMinPayPercent);
  setWorkStartMinPayPct(next);
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadWorkStartMinPayPct();
  return () => listeners.delete(listener);
}

/** Текущий порог (реактивно); до загрузки — дефолтные 70%. */
export function useWorkStartMinPayPct(): number {
  return useSyncExternalStore(
    subscribe,
    () => cachedPct,
    () => PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT
  );
}

/** Синхронное чтение кэша (для чистых утилит списка, без подписки). */
export function getWorkStartMinPayPctSync(): number {
  return cachedPct;
}
