import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import OwnerSidebar from "@/components/layout/OwnerSidebar";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOwnerPortalAccess();

  return (
    <div className="flex h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-semibold text-brand-700">Owner Portal</div>
            <WorkspaceSwitcher currentPortal="owner" />
          </div>
          <div className="text-sm font-medium text-gray-700">{ctx.name}</div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
