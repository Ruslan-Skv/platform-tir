export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type TaskFormState = {
  title: string;
  description: string;
  type: string;
  priority: string;
  dueDate: string;
  assigneeId: string;
};
