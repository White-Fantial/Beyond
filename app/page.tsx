/* eslint-disable @next/next/no-html-link-for-pages */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#0a0f1e]/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">B</span>
            <span className="text-xl font-bold tracking-tight">Beyond</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#portals" className="hover:text-white transition-colors">Portals</a>
            <a href="#integrations" className="hover:text-white transition-colors">Integrations</a>
            <a href="#marketplace" className="hover:text-white transition-colors">Marketplace</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-300 hover:text-white transition-colors font-medium px-3 py-1.5">
              Sign In
            </a>
            <a href="/login" className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all shadow-lg shadow-sky-500/25">
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-28 px-6 overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-sky-600/20 blur-[120px]" />
          <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="absolute top-[20%] right-[5%] w-[250px] h-[250px] rounded-full bg-blue-500/10 blur-[80px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 rounded-full px-4 py-1.5 text-sky-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            All-in-one food business platform
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Run Your Food Business{" "}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Beyond Limits
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            One platform to manage your POS, delivery channels, multi-store operations, customer subscriptions, cost tracking, and a recipe marketplace — all in real time.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-xl shadow-sky-500/30 hover:shadow-sky-400/40 hover:-translate-y-0.5"
            >
              Start for Free →
            </a>
            <a
              href="#features"
              className="border border-white/20 text-gray-300 hover:text-white hover:border-white/40 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:-translate-y-0.5"
            >
              See Features
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-3xl font-extrabold text-white mb-1">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Feature Grid ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need,{" "}
              <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                nothing you don&apos;t
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Built ground-up for food businesses. Replace five tools with one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white/5 hover:bg-white/8 border border-white/10 hover:border-sky-500/40 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 ${f.bg}`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                {f.tags && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {f.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Four Portals ── */}
      <section id="portals" className="py-24 px-6 bg-gradient-to-b from-transparent via-sky-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Four purpose-built portals</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Every stakeholder gets a tailored workspace — not a cluttered one-size-fits-all dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portals.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl p-8 border overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${p.cardClass}`}
              >
                <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30 ${p.glow}`} />
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl mb-6 ${p.iconBg}`}>
                  {p.icon}
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">{p.url}</div>
                <h3 className="text-2xl font-bold mb-3">{p.name}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">{p.description}</p>
                <ul className="space-y-2">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor}`} />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cost Management ── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 text-emerald-400 text-sm font-medium mb-6">
                💰 Cost Intelligence
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Know your true{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  food cost
                </span>{" "}
                in real time
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Beyond automatically scrapes supplier websites for live pricing, rebuilds your ingredient costs, and surfaces exact recipe margins — so you price with confidence.
              </p>
              <ul className="space-y-4">
                {costFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300">
                    <span className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-5">
              {costCards.map((c) => (
                <div key={c.label} className="flex items-center justify-between bg-white/5 rounded-xl px-5 py-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">{c.label}</div>
                    <div className="text-white font-semibold">{c.value}</div>
                  </div>
                  <span className={`text-sm font-bold ${c.positive ? "text-emerald-400" : "text-red-400"}`}>{c.delta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" className="py-24 px-6 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-violet-400 text-sm font-medium mb-6">
            🔌 Integrations
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Connects to your{" "}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              entire stack
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-14">
            Bi-directional sync with POS, delivery platforms, and payment providers — with field-level conflict resolution and policy-based two-way sync.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {integrations.map((i) => (
              <div key={i.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-violet-500/40 hover:bg-white/8 transition-all">
                <span className="text-3xl">{i.icon}</span>
                <span className="text-sm font-medium text-gray-300">{i.name}</span>
                <span className="text-xs text-gray-500">{i.type}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {catalogFeatures.map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Marketplace ── */}
      <section id="marketplace" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-4">
                {marketplaceCards.map((c) => (
                  <div key={c.title} className={`rounded-2xl p-5 border ${c.cardClass}`}>
                    <div className="text-2xl mb-3">{c.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">{c.title}</div>
                    <div className="text-xs text-gray-400">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
                🛒 Recipe Marketplace
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                A whole new{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  revenue stream
                </span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Sell your proven recipes to other food operators on the Beyond marketplace. Stripe Connect handles payouts automatically — you just create.
              </p>
              <ul className="space-y-4">
                {marketplaceFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300">
                    <span className="mt-1 w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-sky-900/60 via-blue-900/60 to-violet-900/60 border border-sky-500/30 rounded-3xl p-16 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/20 blur-[80px] rounded-full" />
            </div>
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
                Ready to go{" "}
                <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
                  Beyond?
                </span>
              </h2>
              <p className="text-gray-300 text-lg mb-10 max-w-lg mx-auto">
                Join food businesses that run smarter operations, know their true costs, and grow faster with Beyond.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href="/login"
                  className="bg-sky-500 hover:bg-sky-400 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-xl shadow-sky-500/30 hover:-translate-y-0.5"
                >
                  Get Started Free
                </a>
              </div>
              <p className="mt-6 text-gray-500 text-sm">No credit card required · Free plan available</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">B</span>
            <span className="font-bold">Beyond</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
            <a href="#portals" className="hover:text-gray-300 transition-colors">Portals</a>
            <a href="#integrations" className="hover:text-gray-300 transition-colors">Integrations</a>
            <a href="/login" className="hover:text-gray-300 transition-colors">Sign In</a>
          </div>
          <div className="text-sm text-gray-600">© {new Date().getFullYear()} Beyond. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

/* ── Data ── */

const stats = [
  { value: "4", label: "Purpose-Built Portals" },
  { value: "13+", label: "Feature Modules" },
  { value: "800+", label: "Automated Tests" },
  { value: "∞", label: "Stores Supported" },
];

const coreFeatures = [
  {
    icon: "🏪",
    bg: "bg-sky-500/15",
    title: "Multi-Store Management",
    description: "Create and manage multiple store locations under one owner account. Compare KPIs, staff, and operations side-by-side.",
    tags: ["Dashboard", "Analytics", "Teams"],
  },
  {
    icon: "🖥️",
    bg: "bg-indigo-500/15",
    title: "POS & Delivery Integration",
    description: "Connect Loyverse, Uber Eats, and DoorDash. Bi-directional catalog sync with full conflict resolution keeps every channel in sync.",
    tags: ["Loyverse", "Uber Eats", "DoorDash"],
  },
  {
    icon: "📦",
    bg: "bg-violet-500/15",
    title: "Catalog Management",
    description: "Internal catalog is your single source of truth. Import, publish, detect conflicts, and execute policy-based two-way sync across all channels.",
    tags: ["Phase 1–8", "Auto-Match", "Merge Editor"],
  },
  {
    icon: "💵",
    bg: "bg-emerald-500/15",
    title: "Cost & Recipe Management",
    description: "Build recipes from ingredients, track supplier prices with automated scraping, and see exact margins per dish.",
    tags: ["Ingredients", "Recipes", "Suppliers"],
  },
  {
    icon: "🔄",
    bg: "bg-cyan-500/15",
    title: "Subscriptions & Loyalty",
    description: "Launch recurring subscription plans, a loyalty rewards program, gift cards, and promo codes — all from the Owner Console.",
    tags: ["Recurring", "Loyalty", "Gift Cards"],
  },
  {
    icon: "📣",
    bg: "bg-pink-500/15",
    title: "Notifications & Webhooks",
    description: "Real-time SSE streams, transactional emails via Resend, web push, and HMAC-signed outbound webhooks for custom automation.",
    tags: ["Email", "Push", "Webhooks"],
  },
];

const portals = [
  {
    name: "Customer App",
    url: "/app",
    icon: "👤",
    description: "Your customers get a polished self-service portal: order history, active subscriptions, loyalty points, referrals, reviews, and support — all in one place.",
    highlights: [
      "Order history & tracking",
      "Subscription management",
      "Loyalty points & referrals",
      "Support tickets",
      "Push notification preferences",
    ],
    cardClass: "bg-sky-950/40 border-sky-500/20 hover:border-sky-400/40",
    iconBg: "bg-sky-500/20",
    glow: "bg-sky-400",
    dotColor: "bg-sky-400",
  },
  {
    name: "Back Office",
    url: "/backoffice",
    icon: "⚡",
    description: "Your frontline team gets a fast, focused workspace for daily operations — orders, inventory, menu, and staff — without the noise of corporate dashboards.",
    highlights: [
      "Real-time order management",
      "Inventory & sold-out control",
      "Menu & modifier editing",
      "Staff role management",
      "Daily sales reports",
    ],
    cardClass: "bg-violet-950/40 border-violet-500/20 hover:border-violet-400/40",
    iconBg: "bg-violet-500/20",
    glow: "bg-violet-400",
    dotColor: "bg-violet-400",
  },
  {
    name: "Owner Console",
    url: "/owner",
    icon: "📊",
    description: "Business owners get aggregate KPIs, multi-store controls, CRM, cost intelligence, integration management, and compliance — all under one roof.",
    highlights: [
      "Aggregate revenue & orders",
      "Advanced analytics & alerts",
      "Customer CRM",
      "Billing & invoices",
      "Outbound webhooks",
    ],
    cardClass: "bg-emerald-950/40 border-emerald-500/20 hover:border-emerald-400/40",
    iconBg: "bg-emerald-500/20",
    glow: "bg-emerald-400",
    dotColor: "bg-emerald-400",
  },
  {
    name: "Admin Console",
    url: "/admin",
    icon: "🛡️",
    description: "Platform administrators get full visibility: tenant management, user impersonation, feature flags, system health, compliance tooling, and marketplace moderation.",
    highlights: [
      "Tenant & user management",
      "Feature flag toggles",
      "GDPR data export & erasure",
      "System health monitoring",
      "Marketplace moderation",
    ],
    cardClass: "bg-rose-950/40 border-rose-500/20 hover:border-rose-400/40",
    iconBg: "bg-rose-500/20",
    glow: "bg-rose-400",
    dotColor: "bg-rose-400",
  },
];

const costFeatures = [
  "Define ingredients with unit costs and supplier references",
  "Build recipes and instantly see theoretical cost per serving",
  "Automated supplier price scraping with encrypted credentials",
  "Base price auto-recomputed after each scrape run",
  "Price delta tracking — compare current vs. previous supplier prices",
];

const costCards = [
  { label: "Chicken Burger Recipe Cost", value: "₩3,420 / serving", delta: "▼ 5.2%", positive: true },
  { label: "Avocado Toast Cost", value: "₩2,180 / serving", delta: "▲ 1.8%", positive: false },
  { label: "Signature Latte Cost", value: "₩890 / cup", delta: "▼ 2.1%", positive: true },
  { label: "Avg. Food Cost Ratio", value: "28.4%", delta: "▼ 1.3pp", positive: true },
];

const integrations = [
  { name: "Loyverse", icon: "🖥️", type: "POS System" },
  { name: "Uber Eats", icon: "🚗", type: "Delivery" },
  { name: "DoorDash", icon: "🏃", type: "Delivery" },
  { name: "Stripe", icon: "💳", type: "Payments" },
  { name: "Stripe Connect", icon: "🔗", type: "Payouts" },
  { name: "Resend", icon: "📧", type: "Email" },
  { name: "Web Push", icon: "🔔", type: "Notifications" },
  { name: "Webhooks", icon: "⚡", type: "Automation" },
];

const catalogFeatures = [
  {
    icon: "🔄",
    title: "Policy-Based Two-Way Sync",
    description: "Define per-field sync policies: direction, conflict strategy, and auto-apply mode. Planner + executor handles the rest automatically.",
  },
  {
    icon: "⚔️",
    title: "Conflict Detection & Resolution",
    description: "Field-level conflict detection when both sides change the same data. Five resolution strategies including manual merge editor.",
  },
  {
    icon: "📋",
    title: "Advanced Merge Editor",
    description: "Draft-based merge sessions with field-level choices (TAKE_INTERNAL / TAKE_EXTERNAL / CUSTOM_VALUE) before applying to any channel.",
  },
];

const marketplaceCards = [
  {
    title: "Browse Recipes",
    icon: "🍳",
    desc: "Discover proven recipes from top operators",
    cardClass: "bg-amber-950/40 border-amber-500/20",
  },
  {
    title: "Instant Purchase",
    icon: "⚡",
    desc: "Stripe payment intent + webhook confirmation",
    cardClass: "bg-orange-950/40 border-orange-500/20",
  },
  {
    title: "Become a Provider",
    icon: "💼",
    desc: "Submit recipes & earn via Stripe Connect",
    cardClass: "bg-yellow-950/40 border-yellow-500/20",
  },
  {
    title: "Provider Earnings",
    icon: "💰",
    desc: "Track payout history & total earnings",
    cardClass: "bg-lime-950/40 border-lime-500/20",
  },
];

const marketplaceFeatures = [
  "Browse and purchase recipes from expert food operators",
  "Become a recipe provider — apply, get approved, start earning",
  "Stripe Connect for automatic provider payouts",
  "Platform moderation queue ensures quality control",
  "Ingredient request system for community-driven catalog growth",
];
