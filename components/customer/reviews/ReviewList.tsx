"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductReview } from "@/types/customer-reviews";
import ReviewCard from "./ReviewCard";

interface Props {
  initialItems: ProductReview[];
  initialTotal: number;
}

export default function ReviewList({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  async function handleDelete(reviewId: string) {
    await fetch(`/api/customer/reviews/${reviewId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((r) => r.id !== reviewId));
    router.refresh();
  }

  if (items.length === 0) {
    return <div className="py-12 text-center text-gray-400 text-sm">No reviews yet.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReviewCard key={r.id} review={r} onDelete={() => handleDelete(r.id)} />
      ))}
    </div>
  );
}
