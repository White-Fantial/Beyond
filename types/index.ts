export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}
