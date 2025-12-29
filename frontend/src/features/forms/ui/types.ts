import type { CallbackFormData } from '../types/forms';

export interface CallbackFormProps {
  onSubmit: (data: CallbackFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface SuccessMessageProps {
  title: string;
  message: string;
  onClose: () => void;
}

