import type { BackofficeStaffMember } from "@/types/backoffice";
import StaffStatusBadge from "./StaffStatusBadge";
import StaffRoleSelect from "./StaffRoleSelect";

function relativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  storeId: string;
  members: BackofficeStaffMember[];
}

export default function StaffRosterTable({ storeId, members }: Props) {
  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">No staff members found.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Last seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {members.map((m) => (
            <tr key={m.storeMembershipId}>
              <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
              <td className="px-4 py-3 text-gray-500">{m.email}</td>
              <td className="px-4 py-3">
                <StaffRoleSelect
                  storeId={storeId}
                  storeMembershipId={m.storeMembershipId}
                  currentRole={m.role}
                />
              </td>
              <td className="px-4 py-3">
                <StaffStatusBadge status={m.status} />
              </td>
              <td className="px-4 py-3 text-gray-400">{relativeDate(m.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
