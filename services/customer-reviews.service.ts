/**
 * Customer Reviews Service — Phase 4.
 * All functions are scoped to userId (and tenantId where applicable).
 */
import { prisma } from "@/lib/prisma";
import type {
  ProductReview,
  ReviewListResult,
  CreateReviewInput,
  ReviewStatus,
} from "@/types/customer-reviews";

function toProductReview(row: {
  id: string;
  tenantId: string;
  userId: string;
  productId: string | null;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductReview {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    productId: row.productId,
    orderId: row.orderId,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status as ReviewStatus,
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCustomerReviews(
  userId: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<ReviewListResult> {
  const { page = 1, pageSize = 20 } = opts;
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productReview.count({ where }),
  ]);
  return { items: rows.map(toProductReview), total, page, pageSize };
}

export async function createCustomerReview(
  userId: string,
  tenantId: string,
  input: CreateReviewInput
): Promise<ProductReview> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }
  const row = await prisma.productReview.create({
    data: {
      tenantId,
      userId,
      productId: input.productId ?? null,
      orderId: input.orderId ?? null,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body ?? null,
      status: "PENDING",
    },
  });
  return toProductReview(row);
}

export async function deleteCustomerReview(
  userId: string,
  reviewId: string
): Promise<void> {
  const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
  if (!review || review.userId !== userId) {
    throw new Error(`Review ${reviewId} not found`);
  }
  await prisma.productReview.delete({ where: { id: reviewId } });
}
