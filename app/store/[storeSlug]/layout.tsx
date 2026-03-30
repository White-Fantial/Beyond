import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Online",
};

/**
 * Layout for /store/[storeSlug] routes.
 *
 * No authentication required — this is the public customer ordering portal.
 * CartProvider is instantiated per-page (inside each page.tsx) to allow
 * server-computed initial pickup time to be passed down.
 */
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
