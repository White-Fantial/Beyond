// Catalog / product management text constants

export const CATALOG = {
  // Products
  products: "Products",
  product: "Product",
  productName: "Product name",
  productDescription: "Description",
  price: "Price",
  category: "Category",
  categories: "Categories",
  modifier: "Modifier",
  modifiers: "Modifiers",
  modifierGroup: "Modifier group",
  modifierGroups: "Modifier groups",
  inventory: "Inventory",
  stock: "Stock",
  soldOut: "Sold out",
  available: "Available",
  unavailable: "Unavailable",
  visible: "Visible",
  hidden: "Hidden",

  // Actions
  createProduct: "Create product",
  editProduct: "Edit product",
  deleteProduct: "Delete product",
  createCategory: "Create category",
  editCategory: "Edit category",
  deleteCategory: "Delete category",
  createModifier: "Create modifier",
  editModifier: "Edit modifier",
  deleteModifier: "Delete modifier",

  // Sync
  syncCatalog: "Sync catalog",
  syncing: "Syncing...",
  syncSuccess: "Catalog sync completed.",
  syncFailed: "Catalog sync failed.",
  lastSynced: "Last synced",
  notSynced: "Not synced",

  // Empty states
  noProducts: "No products found.",
  noCategories: "No categories found.",
  noModifiers: "No modifiers found.",
  noInventory: "No inventory data.",

  // Operations
  markSoldOut: "Mark as sold out",
  markAvailable: "Mark as available",
  toggleVisibility: "Toggle visibility",
} as const;
