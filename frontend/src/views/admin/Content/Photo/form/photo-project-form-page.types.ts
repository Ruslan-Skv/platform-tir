export type PhotoProjectFormPageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type PhotoProjectFormPhoto = {
  id: string;
  imageUrl: string;
};
