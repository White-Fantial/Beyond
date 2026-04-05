import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getReferralStats } from "@/services/customer.service";
import ReferralCard from "@/components/customer/referrals/ReferralCard";
import ReferralHistoryTable from "@/components/customer/referrals/ReferralHistoryTable";

export default async function ReferralsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const stats = await getReferralStats(ctx.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Invite friends and earn loyalty points together.
        </p>
      </div>
      <ReferralCard stats={stats} />
      <ReferralHistoryTable history={stats.referralHistory} />
    </div>
  );
}
