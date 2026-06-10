import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type UseTemplatesLibraryCreateTemplateHelpParams = {
  createTemplateHelpWrapRef: React.RefObject<HTMLDivElement | null>;
};

export function useTemplatesLibraryCreateTemplateHelp({
  createTemplateHelpWrapRef,
}: UseTemplatesLibraryCreateTemplateHelpParams) {
  const [createTemplateHelpOpen, setCreateTemplateHelpOpen] = useState(false);
  const [createTemplateHelpPortalReady, setCreateTemplateHelpPortalReady] = useState(false);
  const [createTemplateTooltipPos, setCreateTemplateTooltipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const createTemplateHelpHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCreateTemplateTooltipPosition = useCallback(() => {
    const el = createTemplateHelpWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCreateTemplateTooltipPos({
      top: rect.bottom + 8,
      left: rect.right,
    });
  }, [createTemplateHelpWrapRef]);

  useEffect(() => {
    setCreateTemplateHelpPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!createTemplateHelpOpen) return;
    updateCreateTemplateTooltipPosition();
    const onScrollOrResize = () => updateCreateTemplateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [createTemplateHelpOpen, updateCreateTemplateTooltipPosition]);

  const showCreateTemplateHelp = useCallback(() => {
    if (createTemplateHelpHideTimerRef.current) {
      clearTimeout(createTemplateHelpHideTimerRef.current);
      createTemplateHelpHideTimerRef.current = null;
    }
    updateCreateTemplateTooltipPosition();
    setCreateTemplateHelpOpen(true);
  }, [updateCreateTemplateTooltipPosition]);

  const hideCreateTemplateHelpWithDelay = useCallback(() => {
    if (createTemplateHelpHideTimerRef.current) {
      clearTimeout(createTemplateHelpHideTimerRef.current);
    }
    createTemplateHelpHideTimerRef.current = setTimeout(() => {
      setCreateTemplateHelpOpen(false);
      createTemplateHelpHideTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(
    () => () => {
      if (createTemplateHelpHideTimerRef.current) {
        clearTimeout(createTemplateHelpHideTimerRef.current);
      }
    },
    []
  );

  return {
    createTemplateHelpOpen,
    createTemplateHelpPortalReady,
    createTemplateTooltipPos,
    hideCreateTemplateHelpWithDelay,
    showCreateTemplateHelp,
  };
}
