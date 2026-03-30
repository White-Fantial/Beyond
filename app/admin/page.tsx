import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";

export default async function AdminHomePage() {
  const ctx = await requirePermission(PERMISSIONS.PLATFORM_ADMIN);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">플랫폼 관리</h1>
      <p className="text-gray-500 mb-6">SaaS 플랫폼 전체를 관리합니다.</p>
      <div className="grid grid-cols-2 gap-4">
        {[
          { href: "/admin/tenants", icon: "🏢", title: "테넌트", desc: "테넌트 관리" },
          { href: "/admin/stores", icon: "🏪", title: "매장", desc: "전체 매장 관리" },
          { href: "/admin/users", icon: "👥", title: "사용자", desc: "전체 사용자 관리" },
          { href: "/admin/integrations", icon: "🔌", title: "연동", desc: "플랫폼 연동 관리" },
          { href: "/admin/jobs", icon: "⚙️", title: "작업", desc: "백그라운드 작업" },
          { href: "/admin/logs", icon: "📋", title: "로그", desc: "시스템 로그" },
          { href: "/admin/billing", icon: "💳", title: "결제", desc: "플랫폼 결제 관리" },
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
