'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

import {
  submitCallbackForm,
  submitDirectorMessageForm,
  submitMeasurementForm,
  submitQuoteForm,
} from '@/shared/api/forms';

import type {
  CallbackFormData,
  DirectorMessageFormData,
  FormSubmissionState,
  MeasurementFormData,
  QuoteFormData,
} from '../types/forms';

interface ModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

interface FormContextValue {
  measurementModal: ModalState;
  callbackModal: ModalState;
  directorMessageModal: ModalState;
  quoteModal: ModalState;
  formSubmission: FormSubmissionState;
  handleMeasurementSubmit: (data: MeasurementFormData) => void;
  handleCallbackSubmit: (data: CallbackFormData) => void;
  handleDirectorMessageSubmit: (data: DirectorMessageFormData) => void;
  handleQuoteSubmit: (data: QuoteFormData) => void;
  handleCloseMeasurement: () => void;
  handleCloseCallback: () => void;
  handleCloseDirectorMessage: () => void;
  handleCloseQuote: () => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [directorMessageModalOpen, setDirectorMessageModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [formSubmission, setFormSubmission] = useState<FormSubmissionState>({
    loading: false,
    success: false,
    error: null,
  });

  const resetFormSubmission = useCallback(() => {
    setFormSubmission({
      loading: false,
      success: false,
      error: null,
    });
  }, []);

  const handleMeasurementSubmit = useCallback(async (data: MeasurementFormData) => {
    setFormSubmission({ loading: true, success: false, error: null });
    try {
      await submitMeasurementForm({
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        productType: data.productType,
        comments: data.comments,
        consentAccepted: true,
      });
      setFormSubmission({ loading: false, success: true, error: null });
    } catch (error) {
      setFormSubmission({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Произошла ошибка при отправке формы',
      });
    }
  }, []);

  const handleCallbackSubmit = useCallback(async (data: CallbackFormData) => {
    setFormSubmission({ loading: true, success: false, error: null });
    try {
      await submitCallbackForm({
        name: data.name,
        phone: data.phone,
        email: data.email,
        preferredTime: data.preferredTime,
        comment: data.comment,
        consentAccepted: true,
      });
      setFormSubmission({ loading: false, success: true, error: null });
    } catch (error) {
      setFormSubmission({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Произошла ошибка при отправке формы',
      });
    }
  }, []);

  const handleDirectorMessageSubmit = useCallback(async (data: DirectorMessageFormData) => {
    setFormSubmission({ loading: true, success: false, error: null });
    try {
      await submitDirectorMessageForm({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        subject: data.subject,
        message: data.message,
        consentAccepted: true,
      });
      setFormSubmission({ loading: false, success: true, error: null });
    } catch (error) {
      setFormSubmission({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Произошла ошибка при отправке письма',
      });
    }
  }, []);

  const handleQuoteSubmit = useCallback(async (data: QuoteFormData) => {
    setFormSubmission({ loading: true, success: false, error: null });
    const parts: string[] = [...data.selectedOptions];
    if (data.customOption?.trim()) {
      parts.push(`Свой вариант: ${data.customOption.trim()}`);
    }
    const serviceType = parts.length > 0 ? parts.join(', ') : 'Не указано';
    try {
      await submitQuoteForm({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        serviceType,
        address: data.address || undefined,
        comment: data.comment || undefined,
        consentAccepted: true,
      });
      setFormSubmission({ loading: false, success: true, error: null });
    } catch (error) {
      setFormSubmission({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Произошла ошибка при отправке заявки',
      });
    }
  }, []);

  const handleCloseMeasurement = useCallback(() => {
    setMeasurementModalOpen(false);
    setTimeout(() => {
      resetFormSubmission();
    }, 300);
  }, [resetFormSubmission]);

  const handleCloseCallback = useCallback(() => {
    setCallbackModalOpen(false);
    setTimeout(() => {
      resetFormSubmission();
    }, 300);
  }, [resetFormSubmission]);

  const handleCloseDirectorMessage = useCallback(() => {
    setDirectorMessageModalOpen(false);
    setTimeout(() => {
      resetFormSubmission();
    }, 300);
  }, [resetFormSubmission]);

  const handleCloseQuote = useCallback(() => {
    setQuoteModalOpen(false);
    setTimeout(() => {
      resetFormSubmission();
    }, 300);
  }, [resetFormSubmission]);

  const measurementModal: ModalState = {
    isOpen: measurementModalOpen,
    open: useCallback(() => {
      resetFormSubmission();
      setMeasurementModalOpen(true);
    }, [resetFormSubmission]),
    close: handleCloseMeasurement,
  };

  const callbackModal: ModalState = {
    isOpen: callbackModalOpen,
    open: useCallback(() => {
      resetFormSubmission();
      setCallbackModalOpen(true);
    }, [resetFormSubmission]),
    close: handleCloseCallback,
  };

  const directorMessageModal: ModalState = {
    isOpen: directorMessageModalOpen,
    open: useCallback(() => {
      resetFormSubmission();
      setDirectorMessageModalOpen(true);
    }, [resetFormSubmission]),
    close: handleCloseDirectorMessage,
  };

  const quoteModal: ModalState = {
    isOpen: quoteModalOpen,
    open: useCallback(() => {
      resetFormSubmission();
      setQuoteModalOpen(true);
    }, [resetFormSubmission]),
    close: handleCloseQuote,
  };

  return (
    <FormContext.Provider
      value={{
        measurementModal,
        callbackModal,
        directorMessageModal,
        quoteModal,
        formSubmission,
        handleMeasurementSubmit,
        handleCallbackSubmit,
        handleDirectorMessageSubmit,
        handleQuoteSubmit,
        handleCloseMeasurement,
        handleCloseCallback,
        handleCloseDirectorMessage,
        handleCloseQuote,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = (): FormContextValue => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
};
