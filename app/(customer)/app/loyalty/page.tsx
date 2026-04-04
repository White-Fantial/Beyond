import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getLoyaltyAccount, getLoyaltyTransactions, getReferralCode } from "@/services/customer.service";
import LoyaltySummaryCard from "@/components/customer/loyalty/LoyaltySummaryCard";
import LoyaltyTransactionList from "@/components/customer/loyalty/LoyaltyTransactionList";
import LoyaltyRedeemForm from "@/components/customer/loyalty/LoyaltyRedeemForm";
import ReferralCodeCard from "@/components/customer/loyalty/ReferralCodeCard";

export default async function LoyaltyPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const [summary, txResult, referral] = await Promise.all([
    getLoyaltyAccount(ctx.userId),
    getLoyaltyTransactions(ctx.userId, { page: 1, pageSize: 20 }),
    getReferralCode(ctx.userId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Loyalty & Rewards</h1>
      <LoyaltySummaryCard summary={summary} />
      <LoyaltyRedeemForm availablePoints={summary.account.points} />
      <ReferralCodeCard referralCode={referral} />
      <LoyaltyTransactionList initialResult={txResult} />
    </div>
  );
}
