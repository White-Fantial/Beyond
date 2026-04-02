import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPlanForm from "@/components/admin/billing/AdminPlanForm";

export default async function NewPlanPage() {
  await requirePlatformAdmin();

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/billing/plans" className="text-xs text-gray-400 hover:underline">
          ← Back to Plans
        </Link>
      </div>
      <AdminPageHeader title="Create New Plan" description="Create a new SaaS pricing plan." />
      <div className="bg-white rounded-lg border border-gray-200 p-5 max-w-2xl">
        <AdminPlanForm />
      </div>
    </div>
  );
}
