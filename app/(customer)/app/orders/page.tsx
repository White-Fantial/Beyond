import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listCustomerOrders } from "@/services/customer.service";
import { OrderListTable } from "@/components/customer/orders/OrderListTable";

interface Props {
  searchParams: Promise<{ status?: string; offset?: string }>;
}

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function CustomerOrdersPage({ searchParams }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const params = await searchParams;
  const status = params.status ?? undefined;
  const offset = parseInt(params.offset ?? "0", 10);

  const result = await listCustomerOrders(ctx.email, { status, limit: LIMIT, offset });
  const hasNext = offset + LIMIT < result.total;
  const hasPrev = offset > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Order History</h1>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = (status ?? "") === opt.value;
          const href = opt.value
            ? `/app/orders?status=${opt.value}`
            : "/app/orders";
          return (
            <Link
              key={opt.value}
              href={href}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                isActive
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* Total */}
      <p className="text-xs text-gray-400 mb-3">
        {result.total === 0
          ? "No orders"
          : `${result.total} order${result.total === 1 ? "" : "s"}`}
      </p>

      <OrderListTable orders={result.orders} />

      {/* Pagination */}
      {(hasPrev || hasNext) && (
        <div className="flex justify-between mt-6">
          {hasPrev ? (
            <Link
              href={`/app/orders?${status ? `status=${status}&` : ""}offset=${Math.max(0, offset - LIMIT)}`}
              className="text-sm text-brand-600 hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link
              href={`/app/orders?${status ? `status=${status}&` : ""}offset=${offset + LIMIT}`}
              className="text-sm text-brand-600 hover:underline"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
