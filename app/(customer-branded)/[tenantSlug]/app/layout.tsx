import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  resolveCustomerStoreContext,
  getSelectableStores,
  CUSTOMER_STORE_COOKIE,
} from "@/lib/customer-store-context";
import { StoreContextProvider } from "@/components/customer/StoreContextProvider";
import { StoreSwitcher } from "@/components/customer/StoreSwitcher";
import Link from "next/link";
import CustomerNotificationBell from "@/components/customer/notifications/CustomerNotificationBell";

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ s?: string }>;
}

const navItems = [
  { href: "", label: "홈", icon: "🏠" },
  { href: "/orders", label: "주문", icon: "📦" },
  { href: "/subscriptions", label: "구독", icon: "🔄" },
  { href: "/loyalty", label: "리워드", icon: "🏅" },
  { href: "/account", label: "계정", icon: "👤" },
];

export default async function BrandedCustomerLayout({ children, params, searchParams }: Props) {
  const ctx = await requirePermission(PERMISSIONS.CUSTOMER_APP);
  const { tenantSlug } = await params;
  const { s: storeCode } = await searchParams;

  const cookieStore = await cookies();
  const cookieStoreId = cookieStore.get(CUSTOMER_STORE_COOKIE)?.value;

  const storeCtx = await resolveCustomerStoreContext(tenantSlug, {
    storeCode,
    cookieStoreId,
    userEmail: ctx.email,
  });

  if (!storeCtx) {
    // Check if tenant exists at all before redirecting
    const selectable = await getSelectableStores(tenantSlug);
    if (!selectable) notFound();
    // Redirect to store-selection page
    redirect(`/${tenantSlug}/app/select-store`);
  }

  // When ?s= resolved a store, persist in cookie and redirect without the param
  if (storeCode) {
    const cookieStore2 = await cookies();
    cookieStore2.set(CUSTOMER_STORE_COOKIE, storeCtx.storeId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 90 * 24 * 60 * 60,
    });
    // Build current URL without ?s=
    redirect(`/${tenantSlug}/app`);
  }

  // Load store options for the switcher (only needed in multi-store tenants)
  const selectable = storeCtx.isMultiStore
    ? await getSelectableStores(tenantSlug)
    : null;
  const stores = selectable?.stores ?? [];

  const base = `/${tenantSlug}/app`;

  return (
    <StoreContextProvider initialContext={storeCtx}>
      <div className="min-h-screen bg-gray-50">
        {/* Top nav */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={base} className="text-lg font-bold text-brand-700">
                {storeCtx.tenantName}
              </Link>
              <StoreSwitcher stores={stores} />
            </div>
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={`${base}${item.href}`}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <CustomerNotificationBell />
            </div>
          </div>

          {/* Store context banner */}
          <div className="max-w-2xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>📍</span>
              <span>{storeCtx.storeName}</span>
            </div>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </div>
    </StoreContextProvider>
  );
}
