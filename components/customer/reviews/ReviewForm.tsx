"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/customer/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: (fd.get("title") as string) || undefined,
          body: (fd.get("body") as string) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit review");
        return;
      }
      (e.target as HTMLFormElement).reset();
      setRating(5);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Write a Review</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Rating *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              className={`text-2xl transition ${s <= rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"}`}
            >★</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input name="title" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional summary" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Review</label>
        <textarea name="body" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Share your experience…" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {isPending ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
