import type { StoreMembershipStatus } from "@/types/backoffice";

const COLORS: Record<StoreMembershipStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-yellow-100 text-yellow-700",
  REMOVED: "bg-red-100 text-red-700",
};

export default function StaffStatusBadge({ status }: { status: StoreMembershipStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
