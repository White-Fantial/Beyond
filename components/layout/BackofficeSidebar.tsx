"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StoreRoleKey } from "@/lib/auth/constants";
import LocaleSwitcher from "@/components/LocaleSwitcher";

interface BackofficeSidebarProps {
  storeId: string;
  storeRole: StoreRoleKey;
  storeName: string;
}

function getNavItems(storeId: string, storeRole: StoreRoleKey) {
  const base = `/backoffice/store/${storeId}`;

  const allItems = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: "📊", roles: ["MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/orders`, label: "Orders", icon: "📦", roles: ["STAFF", "SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/orders/kitchen`, label: "Kitchen Display", icon: "🍳", roles: ["STAFF", "SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/operations`, label: "Operations", icon: "🔧", roles: ["STAFF", "SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/inventory`, label: "Inventory", icon: "📋", roles: ["STAFF", "SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/catalog`, label: "Catalog", icon: "📖", roles: ["MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/products`, label: "Products", icon: "🍽️", roles: ["MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/categories`, label: "Categories", icon: "🗂️", roles: ["SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/modifiers`, label: "Modifiers", icon: "⚙️", roles: ["MANAGER", "OWNER", "ADMIN"] },
    { href: `${base}/reports`, label: "Reports", icon: "📈", roles: ["SUPERVISOR", "MANAGER", "OWNER", "ADMIN"] },
  ];

  return allItems.filter((item) => item.roles.includes(storeRole));
}

export default function BackofficeSidebar({ storeId, storeRole, storeName }: BackofficeSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(storeId, storeRole);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href={`/backoffice/store/${storeId}/dashboard`} className="text-xl font-bold text-brand-700">
          Beyond
        </Link>
        <div className="text-xs text-gray-400 mt-0.5 truncate">🏪 {storeName}</div>
        <div className="text-xs text-brand-600 mt-0.5 font-medium">{storeRole}</div>
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
        <LocaleSwitcher className="mb-2 px-3" />
        <Link
          href="/backoffice/select-store"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full"
        >
          <span>🔀</span>
          <span>Switch store</span>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full mt-1"
          >
            <span>🚪</span>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
