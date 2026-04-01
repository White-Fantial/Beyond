// Status badge component for admin tables and detail views.

const statusStyles: Record<string, string> = {
  // Tenant/User status
  ACTIVE: "bg-green-50 text-green-700 border border-green-200",
  TRIAL: "bg-blue-50 text-blue-700 border border-blue-200",
  SUSPENDED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ARCHIVED: "bg-gray-100 text-gray-500 border border-gray-200",
  INVITED: "bg-purple-50 text-purple-700 border border-purple-200",
  // Subscription billing status
  PAST_DUE: "bg-orange-50 text-orange-700 border border-orange-200",
  CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
  EXPIRED: "bg-gray-100 text-gray-500 border border-gray-200",
  INCOMPLETE: "bg-red-50 text-red-700 border border-red-200",
  // Membership status
  REMOVED: "bg-red-50 text-red-600 border border-red-200",
  INACTIVE: "bg-gray-100 text-gray-500 border border-gray-200",
  // Store status
  // (ACTIVE already covered)
  // Connection status
  CONNECTED: "bg-green-50 text-green-700 border border-green-200",
  NOT_CONNECTED: "bg-gray-100 text-gray-500 border border-gray-200",
  CONNECTING: "bg-blue-50 text-blue-700 border border-blue-200",
  ERROR: "bg-red-50 text-red-600 border border-red-200",
  REAUTH_REQUIRED: "bg-orange-50 text-orange-700 border border-orange-200",
  DISCONNECTED: "bg-gray-100 text-gray-500 border border-gray-200",
  // Platform roles
  PLATFORM_ADMIN: "bg-red-50 text-red-700 border border-red-200",
  PLATFORM_SUPPORT: "bg-orange-50 text-orange-700 border border-orange-200",
  USER: "bg-gray-100 text-gray-600 border border-gray-200",
  // Membership/Store roles
  OWNER: "bg-violet-50 text-violet-700 border border-violet-200",
  ADMIN: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  MANAGER: "bg-blue-50 text-blue-700 border border-blue-200",
  SUPERVISOR: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  STAFF: "bg-slate-100 text-slate-600 border border-slate-200",
  ANALYST: "bg-teal-50 text-teal-700 border border-teal-200",
};

interface StatusBadgeProps {
  value: string;
  label?: string;
}

export default function StatusBadge({ value, label }: StatusBadgeProps) {
  const style = statusStyles[value] ?? "bg-gray-100 text-gray-600 border border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {label ?? value}
    </span>
  );
}
