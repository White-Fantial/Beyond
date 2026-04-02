"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/owner", label: "Owner Home", icon: "🏠" },
  { href: "/owner/stores", label: "Stores", icon: "🏪" },
  { href: "/owner/team", label: "Team", icon: "👥" },
  { href: "/owner/billing", label: "Billing & Subscriptions", icon: "💳" },
  { href: "/owner/integrations", label: "Integrations", icon: "🔌" },
  { href: "/owner/settings", label: "Settings", icon: "⚙️" },
  { href: "/owner/reports", label: "Reports", icon: "📈" },
];

export default function OwnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/owner" className="text-xl font-bold text-brand-700">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5">Owner Portal</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
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
