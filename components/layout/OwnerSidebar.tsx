"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { extractOwnerStoreId } from "@/lib/utils/route-helpers";

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

const storeManagementItems: NavItem[] = [
  { href: "/owner/stores", label: "My Stores", icon: "🏬", exact: true },
  { href: "/owner/team", label: "Team", icon: "👥" },
];

const customersItems: NavItem[] = [
  { href: "/owner/customers", label: "Customers", icon: "👤" },
  { href: "/owner/promotions", label: "Promotions", icon: "🏷️" },
  { href: "/owner/gift-cards", label: "Gift Cards", icon: "🎁" },
];

const costItems: NavItem[] = [
  { href: "/owner/products", label: "Products", icon: "📦", exact: true },
  { href: "/owner/products/categories", label: "Categories", icon: "🗂️" },
  { href: "/owner/products/modifiers", label: "Modifiers", icon: "🔧" },
  { href: "/owner/ingredients", label: "Ingredients", icon: "🥕" },
  { href: "/owner/ingredient-requests", label: "Ingredient Requests", icon: "🌿" },
  { href: "/owner/suppliers", label: "Suppliers", icon: "🚚" },
  { href: "/owner/supplier-requests", label: "Request Supplier", icon: "📨" },
];

const insightsItems: NavItem[] = [
  { href: "/owner/reports", label: "Reports", icon: "📈" },
  { href: "/owner/analytics", label: "Advanced Analytics", icon: "🔬" },
];

const developerItems: NavItem[] = [
  { href: "/owner/webhooks", label: "Webhooks", icon: "🔗" },
  { href: "/owner/alert-rules", label: "Alert Rules", icon: "⚡" },
  { href: "/owner/notifications", label: "Notifications", icon: "🔔" },
  { href: "/owner/logs", label: "Integration Logs", icon: "📋" },
];

const settingsItems: NavItem[] = [
  { href: "/owner/billing", label: "Billing", icon: "💳" },
  { href: "/owner/catalog", label: "Catalog Settings", icon: "📖" },
  { href: "/owner/activity", label: "Activity & Audit", icon: "🔍" },
];

const sections: NavSection[] = [
  { title: "Store Management", items: storeManagementItems },
  { title: "Customers", items: customersItems },
  { title: "Cost Management", items: costItems },
  { title: "Data & Insights", items: insightsItems },
  { title: "Developer Tools", items: developerItems },
  { title: "Settings", items: settingsItems },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

function CollapsedNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center justify-center w-10 h-10 rounded-lg text-base transition-colors mx-auto ${
        isActive
          ? "bg-brand-50 text-brand-700"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span>{item.icon}</span>
    </Link>
  );
}

/** Full-width sidebar rendered when NOT inside a store-scoped page. */
function FullSidebar({ pathname }: { pathname: string }) {
  const isDashboardActive = pathname === "/owner" || pathname === "/owner/dashboard";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/owner" className="text-xl font-bold text-brand-700">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Owner Portal</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Owner navigation">
        {/* Home — Business Dashboard */}
        <Link
          href="/owner"
          aria-current={isDashboardActive ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isDashboardActive
              ? "bg-brand-50 text-brand-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <span>🏠</span>
          <span>Home</span>
        </Link>

        {sections.map((section) => (
          <div key={section.title}>
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </span>
            </div>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Collapsed icon-only sidebar shown when inside a store-scoped page. */
function CollapsedSidebar({ pathname }: { pathname: string }) {
  const isDashboardActive = pathname === "/owner" || pathname === "/owner/dashboard";

  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Compact logo */}
      <div className="flex items-center justify-center py-5 border-b border-gray-100">
        <Link href="/owner" title="Beyond Owner Portal" className="text-xl font-bold text-brand-700">
          B
        </Link>
      </div>

      {/* Icon-only nav */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Owner navigation">
        {/* Home */}
        <div className="px-3 py-1">
          <Link
            href="/owner"
            title="Home"
            aria-current={isDashboardActive ? "page" : undefined}
            className={`flex items-center justify-center w-10 h-10 rounded-lg text-base transition-colors mx-auto ${
              isDashboardActive
                ? "bg-brand-50 text-brand-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            🏠
          </Link>
        </div>

        <div className="mx-3 my-1 border-t border-gray-100" />

        {sections.map((section) => (
          <div key={section.title} className="px-3 py-1 space-y-0.5">
            {section.items.map((item) => (
              <CollapsedNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      {/* Logout icon */}
      <div className="flex items-center justify-center py-4 border-t border-gray-100">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            title="Log out"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-base text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            🚪
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function OwnerSidebar() {
  const pathname = usePathname();

  // Detect store context: /owner/stores/[storeId] or /owner/stores/[storeId]/*
  const activeStoreId = extractOwnerStoreId(pathname);

  if (activeStoreId) {
    return <CollapsedSidebar pathname={pathname} />;
  }

  return <FullSidebar pathname={pathname} />;
}
