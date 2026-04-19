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

const storeManagementItems: NavItem[] = [
  { href: "/owner/stores", label: "My Stores", icon: "🏬" },
  { href: "/owner/team", label: "Team", icon: "👥" },
];

const customersItems: NavItem[] = [
  { href: "/owner/customers", label: "Customers", icon: "👤" },
  { href: "/owner/promotions", label: "Promotions", icon: "🏷️" },
  { href: "/owner/gift-cards", label: "Gift Cards", icon: "🎁" },
];

const costItems: NavItem[] = [
  { href: "/owner/recipes", label: "Recipe Library", icon: "📋" },
  { href: "/owner/ingredients", label: "Ingredients", icon: "🥕" },
  { href: "/owner/suppliers", label: "Suppliers", icon: "🚚" },
  { href: "/owner/supplier-credentials", label: "Supplier Accounts", icon: "🔑" },
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

export default function OwnerSidebar() {
  const pathname = usePathname();

  const isDashboardActive = pathname === "/owner" || pathname === "/owner/dashboard";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/owner" className="text-xl font-bold text-brand-700">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Owner Portal</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Home — Business Dashboard */}
        <Link
          href="/owner"
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
