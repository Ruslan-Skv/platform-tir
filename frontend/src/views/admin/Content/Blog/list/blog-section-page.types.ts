export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type BlogStats = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  pendingComments: number;
};

export type DeleteTarget = {
  type: 'post' | 'category';
  id: string;
  name: string;
};
