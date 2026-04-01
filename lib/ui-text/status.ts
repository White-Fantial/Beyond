// Status label mappers — centralised English labels for all enum-based statuses

// ─── Connection / Integration ──────────────────────────────────────────────

export type ConnectionStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "FAILED"
  | "PENDING"
  | "RECONNECTING"
  | "REAUTH_REQUIRED"
  | string;

export function getConnectionStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "CONNECTED":
      return "Connected";
    case "DISCONNECTED":
      return "Disconnected";
    case "FAILED":
      return "Failed";
    case "PENDING":
      return "Pending";
    case "RECONNECTING":
      return "Reconnecting";
    case "REAUTH_REQUIRED":
      return "Re-auth required";
    default:
      return status ?? "Unknown";
  }
}

// ─── Order ─────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "ORDER_RECEIVED"
  | "CONFIRMED"
  | "IN_PREPARATION"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | string;

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "ORDER_RECEIVED":
      return "Order received";
    case "CONFIRMED":
      return "Confirmed";
    case "IN_PREPARATION":
      return "In preparation";
    case "READY_FOR_PICKUP":
      return "Ready for pickup";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
      return "Failed";
    default:
      return status ?? "Unknown";
  }
}

// ─── Job ───────────────────────────────────────────────────────────────────

export type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING"
  | string;

export function getJobStatusLabel(status: JobStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "RUNNING":
      return "Running";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "RETRYING":
      return "Retrying";
    default:
      return status ?? "Unknown";
  }
}

// ─── Feature Flag ──────────────────────────────────────────────────────────

export type FeatureFlagStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | string;

export function getFeatureFlagStatusLabel(status: FeatureFlagStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "ARCHIVED":
      return "Archived";
    default:
      return status ?? "Unknown";
  }
}

// ─── Billing / Subscription ────────────────────────────────────────────────

export type BillingStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED"
  | "PENDING"
  | string;

export function getBillingStatusLabel(status: BillingStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "TRIALING":
      return "Trialing";
    case "PAST_DUE":
      return "Past due";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "SUSPENDED":
      return "Suspended";
    case "PENDING":
      return "Pending";
    default:
      return status ?? "Unknown";
  }
}

// ─── User / Platform ───────────────────────────────────────────────────────

export type PlatformRole =
  | "PLATFORM_ADMIN"
  | "PLATFORM_OPERATOR"
  | "USER"
  | string;

export function getRoleLabel(role: PlatformRole | string): string {
  switch (role) {
    case "PLATFORM_ADMIN":
      return "Platform Admin";
    case "PLATFORM_OPERATOR":
      return "Platform Operator";
    case "USER":
      return "User";
    // Store roles
    case "OWNER":
      return "Owner";
    case "MANAGER":
      return "Manager";
    case "SUPERVISOR":
      return "Supervisor";
    case "STAFF":
      return "Staff";
    // Tenant roles
    case "TENANT_ADMIN":
      return "Tenant Admin";
    case "TENANT_MEMBER":
      return "Tenant Member";
    default:
      return role ?? "Unknown";
  }
}

export function getPermissionLabel(permission: string): string {
  return permission
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Log / Audit ───────────────────────────────────────────────────────────

export type LogType =
  | "AUDIT"
  | "CONNECTION_ACTION"
  | "INBOUND_WEBHOOK"
  | "ORDER_EVENT"
  | string;

export function getLogTypeLabel(type: LogType): string {
  switch (type) {
    case "AUDIT":
      return "Audit log";
    case "CONNECTION_ACTION":
      return "Connection action";
    case "INBOUND_WEBHOOK":
      return "Inbound webhook";
    case "ORDER_EVENT":
      return "Order event";
    default:
      return type ?? "Unknown";
  }
}

// ─── General entity status ─────────────────────────────────────────────────

export type EntityStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;

export function getEntityStatusLabel(status: EntityStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status ?? "Unknown";
  }
}

// ─── Portal label ──────────────────────────────────────────────────────────

export type PortalKey = "admin" | "owner" | "backoffice" | "customer";

export function getPortalLabel(portal: PortalKey): string {
  switch (portal) {
    case "admin":
      return "Platform Admin";
    case "owner":
      return "Owner Portal";
    case "backoffice":
      return "Backoffice";
    case "customer":
      return "Customer App";
    default:
      return portal;
  }
}
