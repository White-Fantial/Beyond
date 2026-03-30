"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "관리 홈", icon: "🏠" },
  { href: "/admin/tenants", label: "테넌트", icon: "🏢" },
  { href: "/admin/stores", label: "매장", icon: "🏪" },
  { href: "/admin/users", label: "사용자", icon: "👥" },
  { href: "/admin/integrations", label: "연동", icon: "🔌" },
  { href: "/admin/jobs", label: "작업", icon: "⚙️" },
  { href: "/admin/logs", label: "로그", icon: "📋" },
  { href: "/admin/billing", label: "결제", icon: "💳" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <Link href="/admin" className="text-xl font-bold text-white">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Platform Admin</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full"
          >
            <span>🚪</span>
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
