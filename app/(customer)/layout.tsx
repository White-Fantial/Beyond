import CustomerNav from "@/components/layout/CustomerNav";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-0">
        <WorkspaceSwitcher currentPortal="customer" />
      </div>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
