'use client';

import { useCallback } from 'react';

import { useAdminStickySaveButton } from '@/views/admin/ui/AdminStickySaveButton';

type UseProductEditSaveButtonParams = {
  saving: boolean;
  loading: boolean;
  productNotFound: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  pageHeaderRef: React.RefObject<HTMLDivElement | null>;
};

export function useProductEditSaveButton({
  saving,
  loading,
  productNotFound,
  formRef,
  pageHeaderRef,
}: UseProductEditSaveButtonParams) {
  const submitProductForm = useCallback(() => {
    formRef.current?.requestSubmit();
  }, [formRef]);

  const stickySave = useAdminStickySaveButton({
    enabled: !loading && !productNotFound,
    loading,
    saving,
    pageHeaderRef,
    onSave: submitProductForm,
  });

  return {
    ...stickySave,
    saveButtonState: stickySave,
    handleHeaderSaveClick: stickySave.handleSaveClick,
    submitProductForm,
  };
}
