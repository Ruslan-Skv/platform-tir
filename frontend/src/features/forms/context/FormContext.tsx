'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  CallbackFormData,
  DirectorMessageFormData,
  FormSubmissionState,
  MeasurementFormData,
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
  formSubmission: FormSubmissionState;
  handleMeasurementSubmit: (data: MeasurementFormData) => void;
  handleCallbackSubmit: (data: CallbackFormData) => void;
  handleDirectorMessageSubmit: (data: DirectorMessageFormData) => void;
  handleCloseMeasurement: () => void;
  handleCloseCallback: () => void;
  handleCloseDirectorMessage: () => void;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [directorMessageModalOpen, setDirectorMessageModalOpen] = useState(false);
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
      // TODO: Заменить на реальный API вызов
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      // TODO: Заменить на реальный API вызов
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      // TODO: Заменить на реальный API вызов
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFormSubmission({ loading: false, success: true, error: null });
    } catch (error) {
      setFormSubmission({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Произошла ошибка при отправке формы',
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

  return (
    <FormContext.Provider
      value={{
        measurementModal,
        callbackModal,
        directorMessageModal,
        formSubmission,
        handleMeasurementSubmit,
        handleCallbackSubmit,
        handleDirectorMessageSubmit,
        handleCloseMeasurement,
        handleCloseCallback,
        handleCloseDirectorMessage,
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
