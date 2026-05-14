import api from './client';

export type CommentModule = 'COSTING_SHEET' | 'COSTING_SHEET_LINE' | 'BOM' | 'ORDER' | 'STYLE';

export interface Comment {
  id: number;
  module: CommentModule;
  recordId: number;
  parentId: number | null;
  userId: number;
  body: string;
  attachmentUrl: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: number; fullName: string; email: string } | null;
}

export interface CreateCommentInput {
  module: CommentModule;
  recordId: number;
  parentId?: number | null;
  body: string;
  attachmentUrl?: string | null;
}

export interface UpdateCommentInput {
  body: string;
  attachmentUrl?: string | null;
}

interface ApiResp<T> {
  success: boolean;
  message: string;
  data: T;
}

export const commentsApi = {
  list: (module: CommentModule, recordId: number) =>
    api.get<ApiResp<Comment[]>>('/comments', { params: { module, recordId } }),

  create: (data: CreateCommentInput) =>
    api.post<ApiResp<Comment>>('/comments', data),

  update: (id: number, data: UpdateCommentInput) =>
    api.patch<ApiResp<Comment>>(`/comments/${id}`, data),

  delete: (id: number) =>
    api.delete(`/comments/${id}`),
};
