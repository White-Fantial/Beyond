import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  if (!ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-red-700">Platform Admin</div>
            <WorkspaceSwitcher currentPortal="admin" />
          </div>
          <div className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{ctx.name}</div>
        </header>

        {/* Mobile nav bar */}
        <nav className="md:hidden bg-gray-900 text-white flex overflow-x-auto shrink-0 px-2 py-2 gap-1">
          {[
            { href: "/admin", label: "대시보드" },
            { href: "/admin/tenants", label: "테넌트" },
            { href: "/admin/users", label: "사용자" },
            { href: "/admin/stores", label: "매장" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 px-3 py-1.5 rounded text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

