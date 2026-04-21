"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { storeNavGroups } from "@/lib/nav/store-nav";

interface Props {
  storeId: string;
}

export default function StoreSidebar({ storeId }: Props) {
  const pathname = usePathname();
  const base = `/owner/stores/${storeId}`;

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Back to owner menu */}
      <div className="px-4 py-3.5 border-b border-gray-100">
        <Link
          href="/owner/stores"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-700 transition-colors"
        >
          <span>←</span>
          <span>Owner Menu</span>
        </Link>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
          Store View
        </div>
      </div>

      {/* Store nav groups */}
      <nav className="flex-1 px-2 py-3" aria-label="Store navigation">
        {storeNavGroups.map((group) => {
          const hasActive = group.items.some((item) => {
            const href = `${base}${item.suffix}`;
            return item.exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
          });
          return (
            <div key={group.group} className="mb-1">
              <div className="px-2 pt-2 pb-0.5">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    hasActive ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {group.group}
                </span>
              </div>
              <div className="space-y-0.5 px-1">
                {group.items.map((item) => {
                  const href = `${base}${item.suffix}`;
                  const isActive = item.exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={item.suffix}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700 font-medium border-l-2 border-brand-500"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <span className="text-[13px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
