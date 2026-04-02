// Admin panel text constants

export const ADMIN = {
  // Navigation
  dashboard: "Dashboard",
  tenants: "Tenants",
  users: "Users",
  stores: "Stores",
  integrations: "Integrations",
  jobs: "Jobs",
  logs: "Logs",
  billing: "Billing",
  featureFlags: "Feature Flags",
  system: "System",
  analytics: "Analytics",
  plans: "Plans",
  tenantBilling: "Tenant Billing",

  // Sections
  platformAdmin: "Platform Admin",
  systemMonitoring: "System Monitoring",
  jobsConsole: "Jobs Console",
  logsConsole: "Logs",

  // Tenant
  tenant: "Tenant",
  tenantId: "Tenant ID",
  tenantName: "Tenant name",
  noTenants: "No tenants found.",
  tenantMembers: "Tenant members",
  noTenantMembers: "No members in this tenant.",

  // Users
  user: "User",
  userId: "User ID",
  noUsers: "No users found.",
  joinDate: "Joined",

  // Stores
  store: "Store",
  storeId: "Store ID",
  storeName: "Store name",
  displayName: "Display name",
  noStores: "No stores found.",
  storeMembers: "Store members",
  noStoreMembers: "No store members.",
  externalStoreName: "External store name",

  // Connections / Integrations
  provider: "Provider",
  authScheme: "Auth scheme",
  lastConnected: "Last connected",
  lastSynced: "Last synced",
  noConnections: "No connections found.",
  noConnectionInfo: "No connection information.",

  // Credentials
  credentials: "Credentials",
  noCredentials: "No credentials found.",
  credentialLabel: "Label",
  credentialActive: "Active",
  credentialExpiry: "Expires",
  credentialLastUsed: "Last used",
  credentialRotatedAt: "Rotated",

  // Logs
  receivedAt: "Received",
  channel: "Channel",
  event: "Event",
  processingStatus: "Processing status",
  signatureVerification: "Signature",
  noActionLogs: "No action logs.",
  noWebhookLogs: "No webhook logs.",

  // Memberships
  membershipRole: "Role",
  noMemberships: "No memberships found.",

  // Billing / Plans
  plan: "Plan",
  planName: "Plan name",
  planLimits: "Plan limits",
  planFeatures: "Plan features",
  subscriptionStatus: "Subscription status",
  billingRecord: "Billing record",
  billingNote: "Note",
  trialEndsAt: "Trial ends",
  noPlans: "No plans found.",
  noSubscription: "No active subscription.",
  noSubscriptions: "No subscriptions.",

  // Feature Flags
  flagKey: "Flag key",
  flagName: "Flag name",
  flagStatus: "Status",
  flagAssignments: "Assignments",
  flagAuditLog: "Audit log",
  noFlags: "No feature flags found.",
  noFlagAssignments: "No assignments.",
  noFlagAuditEntries: "No audit log entries.",

  // Jobs
  jobType: "Job type",
  jobStatus: "Status",
  jobPayload: "Payload",
  jobContext: "Context",
  noJobs: "No jobs found.",
  manualJobs: "Manual jobs",

  // System
  serviceStatus: "Service status",
  healthStatus: "Health",
  incidents: "Incidents",
  metrics: "Metrics",
  incidentCount: "Count",
  incidentPeriod: "Period",
  incidentDetail: "Detail",
  noIncidents: "No incidents.",
  noSystemData: "No system data available.",
  warningThreshold: "Warning",
  criticalThreshold: "Critical",

  // Impersonation
  impersonating: "Impersonating",
  endImpersonation: "End impersonation",
  impersonationActive: "Impersonation active",

  // Analytics
  kpi: "KPIs",
  trends: "Trends",
  failureBreakdown: "Failure breakdown",
  problemStores: "Problem stores",
  providerHealth: "Provider health",
  attentionItems: "Needs attention",
} as const;
