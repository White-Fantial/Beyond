import Link from "next/link";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { resolveCustomerStoreContext, CUSTOMER_STORE_COOKIE } from "@/lib/customer-store-context";
import { listCustomerOrders } from "@/services/customer.service";
import {
  OrderStatusBadge,
  CHANNEL_LABELS,
} from "@/components/customer/orders/OrderListTable";

interface Props {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; offset?: string }>;
}

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "RECEIVED", label: "접수됨" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소됨" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtAmount(minor: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(minor / 100);
}

export default async function BrandedOrdersPage({ params, searchParams }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { tenantSlug } = await params;
  const { status, offset: rawOffset } = await searchParams;
  const offset = parseInt(rawOffset ?? "0", 10);

  const cookieStore = await cookies();
  const cookieStoreId = cookieStore.get(CUSTOMER_STORE_COOKIE)?.value;

  const storeCtx = await resolveCustomerStoreContext(tenantSlug, {
    cookieStoreId,
    userEmail: ctx.email,
  });

  const scope = storeCtx
    ? { tenantId: storeCtx.tenantId, storeId: storeCtx.storeId }
    : undefined;

  const { orders, total } = await listCustomerOrders(
    ctx.email,
    { status, limit: LIMIT, offset },
    scope
  );

  const base = `/${tenantSlug}/app`;
  const hasNext = offset + LIMIT < total;
  const hasPrev = offset > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">내 주문</h1>
      {storeCtx && (
        <p className="text-sm text-gray-400 mb-4">📍 {storeCtx.storeName}</p>
      )}

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = (status ?? "") === opt.value;
          const href = opt.value
            ? `${base}/orders?status=${opt.value}`
            : `${base}/orders`;
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

      <p className="text-xs text-gray-400 mb-3">
        {total === 0 ? "주문 없음" : `총 ${total}건`}
      </p>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500">주문 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`${base}/orders/${order.id}`}
              className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-xs text-gray-400">
                    {CHANNEL_LABELS[order.sourceChannel] ?? order.sourceChannel}
                  </span>
                </div>
                <div className="mt-0.5 text-sm font-medium text-gray-900 truncate">
                  {order.storeName ?? storeCtx?.storeName ?? "Unknown Store"}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {fmtDate(order.orderedAt)} · {order.itemCount}개
                </div>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {fmtAmount(order.totalAmount, order.currencyCode)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">›</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasPrev || hasNext) && (
        <div className="flex justify-between mt-6">
          {hasPrev ? (
            <Link
              href={`${base}/orders?${status ? `status=${status}&` : ""}offset=${Math.max(0, offset - LIMIT)}`}
              className="text-sm text-brand-600 hover:underline"
            >
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link
              href={`${base}/orders?${status ? `status=${status}&` : ""}offset=${offset + LIMIT}`}
              className="text-sm text-brand-600 hover:underline"
            >
              다음 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
