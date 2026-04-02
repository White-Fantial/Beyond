// Admin / operational action labels

export const ACTIONS = {
  // Credential
  rotateCredential: "Rotate credential",
  rotateCredentialConfirm: "Rotate credential? Click again to confirm.",
  credentialRotated: "Credential rotated. Tenant must re-authenticate.",

  // Jobs
  retryJob: "Retry job",
  retrying: "Retrying...",
  jobRetried: "Job queued for retry.",
  retryFailed: "Failed to retry job.",

  // Integration / connection
  triggerSync: "Trigger catalog sync",
  triggerSyncSuccess: "Catalog sync triggered.",
  triggerSyncFailed: "Failed to trigger catalog sync.",
  triggerRefreshCheck: "Trigger refresh check",
  triggerRefreshCheckSuccess: "Refresh check triggered.",
  triggerRefreshCheckFailed: "Failed to trigger refresh check.",
  validateConnection: "Validate connection",
  validating: "Validating...",
  connectionValid: "Connection is valid.",
  connectionInvalid: "Connection validation failed.",
  forceReconnect: "Force reconnect",
  reconnecting: "Reconnecting...",
  reconnectSuccess: "Reconnect triggered.",
  reconnectFailed: "Failed to force reconnect.",
  disconnect: "Disconnect",
  disconnectSuccess: "Disconnected successfully.",
  disconnectFailed: "Failed to disconnect.",
  connect: "Connect",
  connectSuccess: "Connected successfully.",
  connectFailed: "Failed to connect.",

  // Status change
  statusChange: "Status change",
  statusChanged: "Status updated.",
  statusChangeFailed: "Failed to update status.",

  // General admin actions
  viewDetails: "View details",
  viewLogs: "View logs",
  viewJobs: "View jobs",
  addMembership: "Add membership",
  editMembership: "Edit membership",
  removeMembership: "Remove membership",

  // User
  editUser: "Edit user",
  createUser: "Create user",
  changePlatformRole: "Change platform role",
  addTenantMembership: "Add tenant membership",

  // Store
  editStore: "Edit store",
  createStore: "Create store",
  addStoreMembership: "Add store membership",
  editStoreMembership: "Edit store membership",

  // Tenant
  editTenant: "Edit tenant",
  createTenant: "Create tenant",
  addTenantMember: "Add tenant member",

  // Billing
  changePlan: "Change plan",
  extendTrial: "Extend trial",
  changeSubscriptionStatus: "Change subscription status",
  addBillingRecord: "Add billing record",
  addBillingNote: "Add note",

  // Feature flags
  createFlag: "Create flag",
  assignFlag: "Assign flag",
  revokeFlag: "Revoke flag",
  changeStatus: "Change status",
} as const;
