import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listStaffMembers, getScheduleData } from "@/services/backoffice/backoffice-staff.service";
import StaffRosterTable from "@/components/backoffice/staff/StaffRosterTable";
import ScheduleGrid from "@/components/backoffice/staff/ScheduleGrid";

export default async function BackofficeStaffPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStorePermission(storeId, PERMISSIONS.STAFF_MANAGE);

  const [staffResult, scheduleData] = await Promise.all([
    listStaffMembers(storeId),
    getScheduleData(storeId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Staff</h1>
        <p className="text-sm text-gray-500">{staffResult.total} member{staffResult.total !== 1 ? "s" : ""}</p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Roster</h2>
        <StaffRosterTable storeId={storeId} members={staffResult.items} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Store Hours</h2>
        <ScheduleGrid hours={scheduleData.hours} />
      </section>
    </div>
  );
}
