import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerAddresses } from "@/services/customer.service";
import AddressList from "@/components/customer/addresses/AddressList";

export default async function CustomerAddressesPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const addresses = await listCustomerAddresses(ctx.userId);

  return <AddressList initialAddresses={addresses} />;
}
