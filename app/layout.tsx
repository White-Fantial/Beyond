import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beyond - Food Business Management",
  description:
    "통합 푸드 비즈니스 운영 SaaS - POS, 배달 플랫폼, 온라인 주문, 구독 서비스 통합 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
