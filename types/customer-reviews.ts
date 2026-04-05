export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProductReview {
  id: string;
  tenantId: string;
  userId: string;
  productId: string | null;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  productId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  body?: string;
}

export interface ReviewListResult {
  items: ProductReview[];
  total: number;
  page: number;
  pageSize: number;
}
