export interface StoreNavGroup {
  group: string;
  items: Array<{ suffix: string; label: string; icon: string; exact?: boolean }>;
}

export const storeNavGroups: StoreNavGroup[] = [
  {
    group: "Store",
    items: [
      { suffix: "", label: "Overview", icon: "📊", exact: true },
      { suffix: "/settings", label: "Store Settings", icon: "⚙️" },
      { suffix: "/staff", label: "Staff", icon: "👥" },
      { suffix: "/reports", label: "Reports", icon: "📈" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { suffix: "/products", label: "Products", icon: "📦" },
      { suffix: "/categories", label: "Categories", icon: "🗂️" },
      { suffix: "/modifiers", label: "Modifiers", icon: "🔧" },
    ],
  },
  {
    group: "Operations",
    items: [
      { suffix: "/integrations", label: "Integrations", icon: "🔌" },
      { suffix: "/subscriptions", label: "Subscriptions", icon: "🔄" },
    ],
  },
];
