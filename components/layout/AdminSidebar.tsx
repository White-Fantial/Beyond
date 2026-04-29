"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const tenantManagementItems: NavItem[] = [
  { href: "/admin/tenants", label: "Tenants", icon: "🏢" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/stores", label: "Stores", icon: "🏪" },
];

const marketplaceItems: NavItem[] = [
  { href: "/admin/marketplace/recipes", label: "Recipe Moderation", icon: "🍳" },
  { href: "/admin/recipes", label: "Recipes", icon: "📋" },
  { href: "/admin/recipe-categories", label: "Recipe Categories", icon: "🏷️" },
  { href: "/admin/provider-applications", label: "Provider Applications", icon: "📝" },
  { href: "/admin/platform-ingredients", label: "Platform Ingredients", icon: "🥬" },
  { href: "/admin/ingredient-requests", label: "Ingredient Requests", icon: "📋" },
  { href: "/admin/suppliers", label: "Platform Suppliers", icon: "🚚" },
  { href: "/admin/supplier-requests", label: "Supplier Requests", icon: "📨" },
];

const platformHealthItems: NavItem[] = [
  { href: "/admin/system", label: "System Monitoring", icon: "🖥️" },
  { href: "/admin/analytics", label: "Platform Analytics", icon: "📊" },
  { href: "/admin/integrations", label: "Integrations", icon: "🔌" },
  { href: "/admin/integrations/credentials", label: "App Credentials", icon: "🔑" },
  { href: "/admin/jobs", label: "Jobs Console", icon: "⚙️" },
  { href: "/admin/logs", label: "System Logs", icon: "📋" },
];

const governanceItems: NavItem[] = [
  { href: "/admin/feature-flags", label: "Feature Flags", icon: "🚩" },
  { href: "/admin/compliance", label: "Compliance", icon: "🛡️" },
];

const billingSubItems = [
  { href: "/admin/billing", label: "Overview", exact: true },
  { href: "/admin/billing/plans", label: "Plans" },
  { href: "/admin/billing/tenants", label: "Tenant Billing" },
];

const sections: NavSection[] = [
  { title: "Tenant Management", items: tenantManagementItems },
  { title: "Marketplace", items: marketplaceItems },
  { title: "Platform Health", items: platformHealthItems },
  { title: "Governance", items: governanceItems },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-gray-700 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-white"
      }`}
    >
      <span className="text-base">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const isBillingActive = pathname === "/admin/billing" || pathname.startsWith("/admin/billing/");

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-700">
        <Link href="/admin" className="text-lg font-bold text-white">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Platform Admin</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard */}
        <Link
          href="/admin"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === "/admin"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="text-base">🏠</span>
          <span>Dashboard</span>
        </Link>

        {sections.map((section) => (
          <div key={section.title}>
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </span>
            </div>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}

        {/* Billing section with sub-items */}
        <div>
          <div className="pt-3 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Billing
            </span>
          </div>
          <Link
            href="/admin/billing"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isBillingActive
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span className="text-base">💳</span>
            <span>Billing</span>
          </Link>
          {isBillingActive && (
            <div className="ml-7 mt-0.5 space-y-0.5">
              {billingSubItems.map((sub) => {
                const subActive = sub.exact
                  ? pathname === sub.href
                  : pathname === sub.href || pathname.startsWith(sub.href + "/");
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      subActive
                        ? "bg-gray-600 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
