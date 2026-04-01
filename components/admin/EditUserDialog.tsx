"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AdminDialog from "./AdminDialog";

interface InitialData {
  name: string;
  email: string;
  phone: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialData: InitialData;
}

const inputCls = "w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EditUserDialog({ open, onClose, userId, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialData.name,
    email: initialData.email,
    phone: initialData.phone ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "수정에 실패했습니다.");
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  return (
    <AdminDialog open={open} onClose={onClose} title="사용자 편집">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">이름 *</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">이메일 *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">전화번호</label>
          <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} placeholder="선택 사항" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60">
            취소
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60">
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
