import CustomerNav from "@/components/layout/CustomerNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
