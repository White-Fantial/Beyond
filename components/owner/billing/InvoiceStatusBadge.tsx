import {
  labelOwnerInvoiceStatus,
  colorOwnerInvoiceStatus,
  type OwnerBillingInvoiceStatusType,
} from "@/lib/billing/labels";
import StatusBadge from "./StatusBadge";

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const s = status as OwnerBillingInvoiceStatusType;
  return <StatusBadge label={labelOwnerInvoiceStatus(s)} color={colorOwnerInvoiceStatus(s)} />;
}
