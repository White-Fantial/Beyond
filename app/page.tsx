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
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          The Operating System for Food Businesses
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Connect your POS, delivery channels, online ordering, subscriptions, and reporting in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="bg-brand-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="#features"
            className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
            Key Features
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
    title: "POS Integration",
    description:
      "Connect your POS system to manage orders, payments, and inventory from a single dashboard.",
  },
  {
    icon: "🚴",
    title: "Delivery Platform Integration",
    description:
      "Receive and manage orders from Uber Eats, DoorDash, and more in one place.",
  },
  {
    icon: "📊",
    title: "Sales Analytics",
    description:
      "Get real-time sales insights and detailed reports to grow your business.",
  },
  {
    icon: "💳",
    title: "Subscription Management",
    description:
      "Create and manage subscription products to build stable recurring revenue.",
  },
  {
    icon: "🏪",
    title: "Multi-Store Management",
    description:
      "Manage multiple locations from one account and compare performance across stores.",
  },
  {
    icon: "🔌",
    title: "Payment Module",
    description:
      "Accept multiple payment methods and deliver a seamless checkout experience.",
  },
];
