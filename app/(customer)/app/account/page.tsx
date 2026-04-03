import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getCustomerAccount } from "@/services/customer.service";
import { ProfileForm } from "@/components/customer/account/ProfileForm";
import { PasswordChangeForm } from "@/components/customer/account/PasswordChangeForm";

export default async function CustomerAccountPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const account = await getCustomerAccount(ctx.userId);

  if (!account) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">My Account</h1>
        <p className="text-gray-500">Account not found.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Account</h1>
      <div className="space-y-4">
        <ProfileForm
          initialName={account.name}
          email={account.email}
          phone={account.phone}
        />
        <PasswordChangeForm />
        <Link
          href="/app/addresses"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div>
              <div className="text-sm font-medium text-gray-900">Manage Addresses</div>
              <div className="text-xs text-gray-500">Add or edit delivery addresses</div>
            </div>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </Link>
      </div>
    </div>
  );
}
