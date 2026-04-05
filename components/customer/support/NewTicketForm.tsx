"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/customer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: fd.get("subject") as string,
          body: fd.get("body") as string,
          priority: (fd.get("priority") as string) || "MEDIUM",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create ticket");
        return;
      }
      const { data } = await res.json();
      router.push(`/app/support/${data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">New Support Request</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Subject *</label>
        <input name="subject" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Briefly describe your issue" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
        <select name="priority" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Message *</label>
        <textarea name="body" required rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Describe your issue in detail…" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
      >
        {isPending ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
