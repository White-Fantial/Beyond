"use client";

import { usePathname } from "next/navigation";
import StoreSidebar from "./StoreSidebar";

export default function OwnerMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const storeMatch = pathname.match(/^\/owner\/stores\/([^/]+)/);
  const activeStoreId = storeMatch?.[1] ?? null;

  if (activeStoreId) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <StoreSidebar storeId={activeStoreId} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    );
  }

  return <main className="flex-1 overflow-auto p-6">{children}</main>;
}
