"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/owner/stores", label: "My Stores", icon: "🏬", exact: false },
  { href: "/owner/dashboard", label: "Tenant Dashboard", icon: "🏠", exact: true },
  { href: "/owner/customers", label: "Customers", icon: "👥", exact: false },
  { href: "/owner/billing", label: "Billing", icon: "💳" },
  { href: "/owner/reports", label: "Reports", icon: "📈" },
  { href: "/owner/activity", label: "Activity & Audit", icon: "🔍" },
  { href: "/owner/logs", label: "Logs", icon: "📋" },
];

const automationItems = [
  { href: "/owner/alert-rules", label: "Alert Rules", icon: "⚡" },
  { href: "/owner/notifications", label: "Notifications", icon: "🔔" },
];

export default function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/owner/stores" className="text-xl font-bold text-brand-700">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Owner Portal</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
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
        })}

        {/* Automation section */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Automation
          </span>
        </div>
        {automationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
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
        })}
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
