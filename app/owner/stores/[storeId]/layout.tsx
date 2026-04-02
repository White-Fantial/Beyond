import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  params: { storeId: string };
}

const storeNavItems = [
  { href: "", label: "대시보드", icon: "📊" },
  { href: "/settings", label: "매장 설정", icon: "⚙️" },
  { href: "/staff", label: "직원 관리", icon: "👥" },
  { href: "/products", label: "상품", icon: "📦" },
  { href: "/categories", label: "카테고리", icon: "🗂️" },
  { href: "/modifiers", label: "옵션", icon: "🔧" },
  { href: "/integrations", label: "채널 연동", icon: "🔌" },
  { href: "/subscriptions", label: "구독", icon: "🔄" },
];

export default async function StoreLayout({ children, params }: Props) {
  const { storeId } = params;
  await requireOwnerStoreAccess(storeId);

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true, status: true },
  });

  return (
    <div className="flex flex-col gap-0">
      {/* Store context header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <Link href="/owner/stores" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← 매장 목록
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">{store?.name ?? storeId}</span>
        {store?.status !== "ACTIVE" && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
            {store?.status}
          </span>
        )}
      </div>

      {/* Store sub-nav */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <nav className="flex gap-0.5 py-1">
          {storeNavItems.map((item) => {
            const href = `/owner/stores/${storeId}${item.href}`;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4">{children}</div>
    </div>
  );
}
