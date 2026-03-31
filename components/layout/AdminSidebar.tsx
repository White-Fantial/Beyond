"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "대시보드", icon: "🏠", exact: true },
  { href: "/admin/tenants", label: "테넌트", icon: "🏢" },
  { href: "/admin/users", label: "사용자", icon: "👥" },
  { href: "/admin/stores", label: "매장", icon: "🏪" },
];

const comingSoonItems = [
  { label: "연동", icon: "🔌" },
  { label: "작업", icon: "⚙️" },
  { label: "로그", icon: "📋" },
  { label: "결제", icon: "💳" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

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

        {comingSoonItems.length > 0 && (
          <div className="pt-3">
            <div className="px-3 pb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">
              Coming Soon
            </div>
            {comingSoonItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 cursor-not-allowed"
              >
                <span className="text-base opacity-50">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}
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

