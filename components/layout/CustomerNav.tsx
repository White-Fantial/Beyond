"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Home", icon: "🏠" },
  { href: "/app/orders", label: "My Orders", icon: "📦" },
  { href: "/app/subscriptions", label: "Subscriptions", icon: "🔄" },
  { href: "/app/account", label: "My Account", icon: "👤" },
];

export default function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/app" className="text-lg font-bold text-brand-700">
          Beyond
        </Link>
        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
