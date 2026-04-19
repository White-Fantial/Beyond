import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { getCustomerTicketDetail } from "@/services/customer-support.service";
import TicketThread from "@/components/customer/support/TicketThread";
import Link from "next/link";

export default async function CustomerTicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const { ticketId } = params;
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const ticket = await getCustomerTicketDetail(ctx.userId, ticketId);

  return (
    <div className="space-y-4">
      <Link href="/app/support" className="text-sm text-gray-400 hover:text-gray-600">← Back to Support</Link>
      <TicketThread ticket={ticket} userId={ctx.userId} />
    </div>
  );
}
