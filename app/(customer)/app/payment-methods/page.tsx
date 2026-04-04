import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listSavedPaymentMethods } from "@/services/customer.service";
import PaymentMethodList from "@/components/customer/payment-methods/PaymentMethodList";

export default async function PaymentMethodsPage() {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const methods = await listSavedPaymentMethods(ctx.userId);

  return <PaymentMethodList initialMethods={methods} />;
}
