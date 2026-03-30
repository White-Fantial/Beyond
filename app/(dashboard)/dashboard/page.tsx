export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 text-sm mt-1">
          오늘의 매장 운영 현황을 확인하세요
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div
              className={`text-xs mt-1 ${
                stat.change.startsWith("+")
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {stat.change} 전일 대비
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">최근 주문</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{order.id}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{order.channel} · {order.time}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{order.amount}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.status === "완료"
                        ? "bg-green-100 text-green-700"
                        : order.status === "처리중"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">채널 연동 상태</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {channels.map((channel) => (
              <div key={channel.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{channel.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{channel.type}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    channel.connected
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {channel.connected ? "연동됨" : "미연동"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const stats = [
  { label: "오늘 매출", value: "₩2,450,000", change: "+12.5%", icon: "💰" },
  { label: "오늘 주문", value: "87건", change: "+8.2%", icon: "📦" },
  { label: "처리 대기", value: "3건", change: "-2건", icon: "⏳" },
  { label: "활성 매장", value: "2개", change: "+0", icon: "🏪" },
];

const recentOrders = [
  { id: "#ORD-2024-001", channel: "배달의민족", time: "10분 전", amount: "₩28,000", status: "처리중" },
  { id: "#ORD-2024-002", channel: "쿠팡이츠", time: "23분 전", amount: "₩45,000", status: "완료" },
  { id: "#ORD-2024-003", channel: "POS (직접)", time: "35분 전", amount: "₩18,500", status: "완료" },
  { id: "#ORD-2024-004", channel: "온라인 주문", time: "1시간 전", amount: "₩67,000", status: "완료" },
];

const channels = [
  { icon: "🍔", name: "배달의민족", type: "배달 플랫폼", connected: true },
  { icon: "🛵", name: "쿠팡이츠", type: "배달 플랫폼", connected: true },
  { icon: "🖥️", name: "포스뱅크 POS", type: "POS 시스템", connected: false },
  { icon: "💳", name: "토스페이먼츠", type: "결제 모듈", connected: false },
];
