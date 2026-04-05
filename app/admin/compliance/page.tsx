import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getRetentionReport } from "@/services/admin/admin-compliance.service";

export default async function AdminCompliancePage() {
  await requirePlatformAdmin();
  const report = await getRetentionReport(365);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">GDPR & Compliance</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Export user data, process erasure requests, and review data retention.
        </p>
      </div>

      {/* User actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">User Data Actions</h2>
        <p className="text-sm text-gray-600">
          Enter a User ID to export all personal data or process a right-to-erasure request.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">📦 Data Export</h3>
            <p className="text-xs text-gray-500 mb-3">
              Downloads a CSV of all personal data for a user.
            </p>
            <p className="text-xs font-mono text-gray-500">
              GET /api/admin/compliance/users/[userId]/export
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">🗑️ Right to Erasure</h3>
            <p className="text-xs text-gray-500 mb-3">
              Anonymises all PII for a user with a full audit trail.
            </p>
            <p className="text-xs font-mono text-gray-500">
              POST /api/admin/compliance/users/[userId]/erasure
            </p>
          </div>
        </div>
      </div>

      {/* Retention report */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Retention Policy Report</h2>
          <span className="text-xs text-gray-500">Records older than 365 days</span>
        </div>
        {report.total === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">
            ✅ No records exceed the retention threshold.
          </div>
        ) : (
          <>
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-sm text-amber-800">
                <strong>{report.total}</strong> records older than {report.thresholdDays} days. Consider archiving or deleting these records.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 bg-gray-50">
                    <th className="px-5 py-2.5 text-left font-medium">ID</th>
                    <th className="px-5 py-2.5 text-left font-medium">Type</th>
                    <th className="px-5 py-2.5 text-left font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.records.slice(0, 100).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-600">{r.id}</td>
                      <td className="px-5 py-2.5 text-gray-700">{r.type}</td>
                      <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.total > 100 && (
              <div className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
                Showing 100 of {report.total} records.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
