import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";

interface JobRow {
  id: string;
  jobType: string;
  status: string;
  triggerSource: string;
  queuedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

interface Props {
  jobs: JobRow[];
  title?: string;
}

export default function RelatedJobList({ jobs, title = "Related Job History" }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
        <p className="text-xs text-gray-400 py-4 text-center">No related job records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Type</th>
              <th className="text-left pb-2 font-medium">Status</th>
              <th className="text-left pb-2 font-medium">Trigger</th>
              <th className="text-left pb-2 font-medium">Started</th>
              <th className="text-left pb-2 font-medium">Completed</th>
              <th className="text-right pb-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2">
                  <span className="font-mono text-xs text-gray-700">{job.jobType}</span>
                </td>
                <td className="py-2">
                  <StatusBadge value={job.status} />
                </td>
                <td className="py-2 text-xs text-gray-500">{job.triggerSource}</td>
                <td className="py-2 text-xs text-gray-500">
                  {job.startedAt ? job.startedAt.toLocaleString("en-US") : "—"}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {job.finishedAt ? job.finishedAt.toLocaleString("en-US") : "—"}
                </td>
                <td className="py-2 text-right">
                  <Link
                    href={`/admin/jobs/${job.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.some((j) => j.errorMessage) && (
        <div className="mt-3 space-y-1">
          {jobs
            .filter((j) => j.errorMessage)
            .slice(0, 3)
            .map((j) => (
              <p key={j.id} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                [{j.jobType}] {j.errorMessage}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
