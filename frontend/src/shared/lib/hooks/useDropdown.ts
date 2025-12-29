import { useState, useCallback } from 'react';

export const useDropdown = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const openDropdown = useCallback((name: string) => {
    setActiveDropdown(name);
  }, []);

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    // Keep dropdown open when hovering over dropdown content
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    closeDropdown();
  }, [closeDropdown]);

  return {
    activeDropdown,
    openDropdown,
    closeDropdown,
    handleDropdownMouseEnter,
    handleDropdownMouseLeave,
  };
};


