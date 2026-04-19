import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import type { MembershipRoleKey } from "@/lib/auth/constants";

interface Props {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}

export default async function StoreLayout({ children, params }: Props) {
  const { storeId } = await params;
  await requireOwnerStoreAccess(storeId);

  const [store, session] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true, status: true },
    }),
    getSession(),
  ]);

  const storeName = store?.name ?? storeId;

  // Resolve back-office href (use session primaryStoreId as fallback)
  const effectiveStoreId =
    storeId ??
    session?.primaryStoreId;
  const backofficeHref = effectiveStoreId
    ? `/backoffice/store/${effectiveStoreId}/orders`
    : "/backoffice/select-store";

  // Determine if customer app / back office links should be shown
  const isOwnerMember =
    session?.primaryMembershipRole !== null &&
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(
      session?.primaryMembershipRole as MembershipRoleKey
    );

  return (
    <div className="flex flex-col gap-0">
      {/* Store header bar — breadcrumb + title + quick actions */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: breadcrumb + title */}
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Link href="/owner/stores" className="hover:text-gray-600 transition-colors">
                Stores
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-gray-600">{storeName}</span>
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{storeName}</h1>
              {store?.status && store.status !== "ACTIVE" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">
                  {store.status}
                </span>
              )}
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/owner/stores"
              className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              ← Switch Store
            </Link>
            {(isOwnerMember || session?.primaryStoreId) && (
              <Link
                href={backofficeHref}
                className="text-xs text-gray-600 hover:text-gray-800 px-2.5 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Back Office ↗
              </Link>
            )}
            <Link
              href="/app"
              className="text-xs text-gray-600 hover:text-gray-800 px-2.5 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Customer App ↗
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-4">{children}</div>
    </div>
  );
}
