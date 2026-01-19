import { useCallback, useRef, useState } from 'react';

const CLOSE_DELAY_MS = 150; // Задержка перед закрытием для плавного перехода

export const useDropdown = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverNavItemRef = useRef(false);
  const isOverDropdownRef = useRef(false);

  // Очистка таймера закрытия
  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Проверка, нужно ли закрывать меню
  const shouldClose = useCallback(() => {
    return !isOverNavItemRef.current && !isOverDropdownRef.current;
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      if (shouldClose()) {
        setActiveDropdown(null);
      }
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimeout, shouldClose]);

  const openDropdown = useCallback(
    (name: string) => {
      clearCloseTimeout();
      isOverNavItemRef.current = true;
      setActiveDropdown(name);
    },
    [clearCloseTimeout]
  );

  const closeDropdown = useCallback(() => {
    // Курсор ушёл с кнопки навигации
    isOverNavItemRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleDropdownMouseEnter = useCallback(() => {
    // Курсор над dropdown — отменяем закрытие
    isOverDropdownRef.current = true;
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handleDropdownMouseLeave = useCallback(() => {
    // Курсор ушёл с dropdown — планируем закрытие
    isOverDropdownRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  return {
    activeDropdown,
    openDropdown,
    closeDropdown,
    handleDropdownMouseEnter,
    handleDropdownMouseLeave,
  };
};
