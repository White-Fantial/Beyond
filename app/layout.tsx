import type { Metadata } from "next";
import "./globals.css";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";

export const metadata: Metadata = {
  title: "Beyond - Food Business Management",
  description:
    "Integrated food business operations platform — POS, delivery, online ordering, subscriptions, and reporting in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}
