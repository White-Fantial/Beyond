import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold text-brand-700">Beyond</div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          매장 운영, 이제 하나로
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Beyond는 POS 시스템, 배달 플랫폼, 온라인 주문을 하나로 통합하는
          <br />
          푸드 비즈니스 운영 솔루션입니다.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="bg-brand-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="#features"
            className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            자세히 보기
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
            주요 기능
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          © 2024 Beyond. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "🖥️",
    title: "POS 통합",
    description:
      "다양한 POS 시스템과 연동하여 주문, 결제, 재고를 하나의 대시보드에서 관리하세요.",
  },
  {
    icon: "🚴",
    title: "배달 플랫폼 연동",
    description:
      "배달의민족, 쿠팡이츠 등 여러 배달 플랫폼의 주문을 한곳에서 받고 처리하세요.",
  },
  {
    icon: "📊",
    title: "매출 분석",
    description:
      "실시간 매출 현황과 상세 분석 리포트로 비즈니스 인사이트를 얻으세요.",
  },
  {
    icon: "💳",
    title: "구독 서비스",
    description:
      "정기 구독 상품을 쉽게 만들고 관리하여 안정적인 수익 구조를 만드세요.",
  },
  {
    icon: "🏪",
    title: "멀티 매장 관리",
    description:
      "여러 매장을 하나의 계정으로 통합 관리하고 각 매장별 성과를 비교하세요.",
  },
  {
    icon: "🔌",
    title: "결제 모듈",
    description:
      "다양한 결제 수단을 통합하여 고객에게 편리한 결제 경험을 제공하세요.",
  },
];
