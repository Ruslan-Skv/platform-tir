export type PhotoSectionPageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type PhotoSectionDeleteTarget = {
  type: 'category' | 'project';
  id: string;
  name: string;
};
