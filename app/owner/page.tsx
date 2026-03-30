import { requireAuth } from "@/lib/auth/permissions";

export default async function OwnerHomePage() {
  const ctx = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">오너 포털</h1>
      <p className="text-gray-500 mb-6">비즈니스 전체를 관리하세요.</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: "/owner/stores", icon: "🏪", title: "매장 관리", desc: "매장 목록 및 설정" },
          { href: "/owner/team", icon: "👥", title: "팀 관리", desc: "직원 및 역할 관리" },
          { href: "/owner/billing", icon: "💳", title: "결제/구독", desc: "플랜 및 결제 관리" },
          { href: "/owner/integrations", icon: "🔌", title: "연동 관리", desc: "POS/배달 플랫폼 연동" },
          { href: "/owner/settings", icon: "⚙️", title: "매장 설정", desc: "운영 환경 설정" },
          { href: "/owner/reports", icon: "📈", title: "리포트", desc: "매출 및 운영 분석" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-medium text-gray-900">{item.title}</div>
            <div className="text-sm text-gray-500">{item.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
