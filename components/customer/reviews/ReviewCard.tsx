import type { ProductReview } from "@/types/customer-reviews";
import StarRating from "./StarRating";

function statusBadge(status: string) {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function ReviewCard({ review, onDelete }: { review: ProductReview; onDelete?: () => void }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <StarRating rating={review.rating} />
          {review.title && <p className="text-sm font-semibold text-gray-900">{review.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(review.status)}`}>
            {review.status.charAt(0) + review.status.slice(1).toLowerCase()}
          </span>
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          )}
        </div>
      </div>
      {review.body && <p className="text-sm text-gray-600">{review.body}</p>}
      <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
