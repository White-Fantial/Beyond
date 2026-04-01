"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "대시보드", icon: "🏠", exact: true },
  { href: "/admin/system", label: "시스템 모니터링", icon: "🖥️" },
  { href: "/admin/tenants", label: "테넌트", icon: "🏢" },
  { href: "/admin/users", label: "사용자", icon: "👥" },
  { href: "/admin/stores", label: "매장", icon: "🏪" },
  { href: "/admin/integrations", label: "연동", icon: "🔌" },
  { href: "/admin/jobs", label: "Jobs Console", icon: "⚙️" },
  { href: "/admin/logs", label: "로그", icon: "📋" },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: "🚩" },
];

const billingSubItems = [
  { href: "/admin/billing", label: "Overview", exact: true },
  { href: "/admin/billing/plans", label: "요금제" },
  { href: "/admin/billing/tenants", label: "테넌트 Billing" },
];

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
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
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
        })}

        {/* Billing section */}
        <div>
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
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

