import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerReviews } from "@/services/customer-reviews.service";
import ReviewList from "@/components/customer/reviews/ReviewList";
import ReviewForm from "@/components/customer/reviews/ReviewForm";

export default async function CustomerReviewsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const result = await listCustomerReviews(ctx.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Reviews</h1>
      <ReviewForm />
      <ReviewList initialItems={result.items} initialTotal={result.total} />
    </div>
  );
}
