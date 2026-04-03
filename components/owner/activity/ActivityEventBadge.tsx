"use client";

const ACTION_COLORS: Record<string, string> = {
  // Staff / role actions
  OWNER_STAFF_INVITED: "bg-blue-100 text-blue-700",
  OWNER_STAFF_ROLE_UPDATED: "bg-violet-100 text-violet-700",
  OWNER_STAFF_REACTIVATED: "bg-green-100 text-green-700",
  OWNER_STAFF_DEACTIVATED: "bg-yellow-100 text-yellow-700",
  OWNER_STAFF_REMOVED: "bg-red-100 text-red-700",
  // Settings actions
  OWNER_STORE_SETTINGS_UPDATED: "bg-sky-100 text-sky-700",
  OWNER_STORE_HOURS_UPDATED: "bg-sky-100 text-sky-700",
  OWNER_CATEGORY_UPDATED: "bg-teal-100 text-teal-700",
  OWNER_PRODUCT_UPDATED: "bg-teal-100 text-teal-700",
  OWNER_MODIFIER_OPTION_UPDATED: "bg-teal-100 text-teal-700",
  OWNER_MODIFIER_GROUP_UPDATED: "bg-teal-100 text-teal-700",
  // Integration actions
  "integration.connected": "bg-green-100 text-green-700",
  "integration.disconnected": "bg-red-100 text-red-700",
  "integration.connect_start": "bg-orange-100 text-orange-700",
  "connection.created": "bg-blue-100 text-blue-700",
  "connection.status_changed": "bg-yellow-100 text-yellow-700",
  CONNECTION_STATUS_CHANGED: "bg-yellow-100 text-yellow-700",
  "connection_credential.rotated": "bg-purple-100 text-purple-700",
  OWNER_CATALOG_SYNC_REQUESTED: "bg-indigo-100 text-indigo-700",
  // Subscription actions
  OWNER_SUBSCRIPTION_PAUSED: "bg-yellow-100 text-yellow-700",
  OWNER_SUBSCRIPTION_RESUMED: "bg-green-100 text-green-700",
  OWNER_SUBSCRIPTION_CANCELLED: "bg-red-100 text-red-700",
  OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED: "bg-sky-100 text-sky-700",
  OWNER_SUBSCRIPTION_NOTE_UPDATED: "bg-gray-100 text-gray-600",
  // Customer actions
  OWNER_CUSTOMER_NOTE_UPDATED: "bg-gray-100 text-gray-600",
  // Membership
  "membership.created": "bg-blue-100 text-blue-700",
  "store_membership.created": "bg-blue-100 text-blue-700",
  TENANT_MEMBERSHIP_CREATED: "bg-blue-100 text-blue-700",
  TENANT_MEMBERSHIP_UPDATED: "bg-violet-100 text-violet-700",
  STORE_MEMBERSHIP_CREATED: "bg-blue-100 text-blue-700",
  STORE_MEMBERSHIP_UPDATED: "bg-violet-100 text-violet-700",
};

const ACTION_LABELS: Record<string, string> = {
  OWNER_STAFF_INVITED: "Staff Invited",
  OWNER_STAFF_ROLE_UPDATED: "Role Updated",
  OWNER_STAFF_REACTIVATED: "Staff Reactivated",
  OWNER_STAFF_DEACTIVATED: "Staff Deactivated",
  OWNER_STAFF_REMOVED: "Staff Removed",
  OWNER_STORE_SETTINGS_UPDATED: "Store Settings",
  OWNER_STORE_HOURS_UPDATED: "Store Hours",
  OWNER_CATEGORY_UPDATED: "Category Updated",
  OWNER_PRODUCT_UPDATED: "Product Updated",
  OWNER_MODIFIER_OPTION_UPDATED: "Modifier Updated",
  OWNER_MODIFIER_GROUP_UPDATED: "Modifier Group",
  "integration.connected": "Connected",
  "integration.disconnected": "Disconnected",
  "integration.connect_start": "Connect Started",
  "connection.created": "Connection Created",
  "connection.status_changed": "Status Changed",
  CONNECTION_STATUS_CHANGED: "Status Changed",
  "connection_credential.rotated": "Credential Rotated",
  OWNER_CATALOG_SYNC_REQUESTED: "Sync Requested",
  OWNER_SUBSCRIPTION_PAUSED: "Sub Paused",
  OWNER_SUBSCRIPTION_RESUMED: "Sub Resumed",
  OWNER_SUBSCRIPTION_CANCELLED: "Sub Cancelled",
  OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED: "Next Date Set",
  OWNER_SUBSCRIPTION_NOTE_UPDATED: "Sub Note",
  OWNER_CUSTOMER_NOTE_UPDATED: "Customer Note",
  "membership.created": "Member Added",
  "store_membership.created": "Store Member Added",
  TENANT_MEMBERSHIP_CREATED: "Member Added",
  TENANT_MEMBERSHIP_UPDATED: "Member Updated",
  STORE_MEMBERSHIP_CREATED: "Store Member Added",
  STORE_MEMBERSHIP_UPDATED: "Store Member Updated",
};

interface Props {
  action: string;
  className?: string;
}

export default function ActivityEventBadge({ action, className = "" }: Props) {
  const color = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-600";
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\./g, " ").toLowerCase();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${color} ${className}`}
    >
      {label}
    </span>
  );
}
