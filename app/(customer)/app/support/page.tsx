import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerTickets } from "@/services/customer-support.service";
import TicketList from "@/components/customer/support/TicketList";
import NewTicketForm from "@/components/customer/support/NewTicketForm";

export default async function CustomerSupportPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const result = await listCustomerTickets(ctx.userId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Support</h1>
      <NewTicketForm />
      <TicketList tickets={result.items} />
    </div>
  );
}
