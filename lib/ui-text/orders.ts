// Customer ordering UI text constants

export const ORDERS = {
  // Cart
  addToCart: "Add to cart",
  add: "Add",
  soldOut: "Sold out",
  cartEmpty: "Your cart is empty.",
  checkout: "Checkout",
  continueOrdering: "Continue ordering",
  reviewOrder: "Review your order",
  quantity: "Quantity",
  remove: "Remove",
  subtotal: "Subtotal",
  total: "Total",
  placeOrder: "Place order",
  orderPlaced: "Order placed!",
  orderFailed: "Failed to place order. Please try again.",

  // Product / options
  chooseOptions: "Choose options",
  selectOption: "Select option",
  featured: "Featured",
  required: "Required",
  optional: "Optional",
  minSelect: (n: number) => `Select at least ${n}`,
  maxSelect: (n: number) => `Select up to ${n}`,
  selectionRequired: "Please make a required selection.",

  // Pickup / time
  pickupTime: "Pickup time",
  asap: "ASAP",
  scheduledPickup: "Scheduled pickup",
  selectPickupTime: "Select pickup time",
  pickupTimeRequired: "Please select a pickup time.",

  // Subscription
  subscription: "Subscription",
  subscriptionOptions: "Subscription options",
  viewSubscriptions: "View subscriptions",
  manageSubscription: "Manage subscription",
  subscribeNow: "Subscribe",
  subscribedMessage: "You are already subscribed.",

  // Order history (customer app)
  myOrders: "My Orders",
  orderHistory: "Order History",
  noOrders: "No orders yet.",
  orderStatus: "Order status",
  orderDate: "Order date",
  orderItems: "Items",
  reorder: "Reorder",
} as const;
