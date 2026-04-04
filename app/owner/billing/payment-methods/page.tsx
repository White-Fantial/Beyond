import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import Link from "next/link";
import PaymentMethodsClient from "./PaymentMethodsClient";

/**
 * /owner/billing/payment-methods
 *
 * Payment method management for the owner.
 * Lists saved cards and allows removing them.
 */
export default async function PaymentMethodsPage() {
  await requireOwnerAdminAccess();

  return (
    <div>
      <div className="mb-4">
        <Link href="/owner/billing" className="text-xs text-gray-400 hover:underline">
          ← Back to Billing
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the cards used for your subscription billing.
        </p>
      </div>
      <PaymentMethodsClient />
    </div>
  );
}
