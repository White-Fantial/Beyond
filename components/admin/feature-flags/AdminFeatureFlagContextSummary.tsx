import { labelFlagType, labelFlagStatus } from "@/lib/flags/labels";
import type { AdminFeatureFlagDetail } from "@/types/feature-flags";

interface Props {
  flag: AdminFeatureFlagDetail;
}

export default function AdminFeatureFlagContextSummary({ flag }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Flag Info</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Key</dt>
        <dd className="font-mono text-gray-800 break-all">{flag.key}</dd>
        <dt className="text-gray-500">Type</dt>
        <dd>{labelFlagType(flag.flagType)}</dd>
        <dt className="text-gray-500">Status</dt>
        <dd>{labelFlagStatus(flag.status)}</dd>
        <dt className="text-gray-500">Experiment</dt>
        <dd>{flag.isExperiment ? "Yes" : "No"}</dd>
        {flag.defaultBoolValue !== null && flag.defaultBoolValue !== undefined && (
          <>
            <dt className="text-gray-500">Default Value(Bool)</dt>
            <dd>{String(flag.defaultBoolValue)}</dd>
          </>
        )}
        {flag.defaultStringValue && (
          <>
            <dt className="text-gray-500">Default Value(String)</dt>
            <dd className="truncate">{flag.defaultStringValue}</dd>
          </>
        )}
        {flag.defaultIntValue !== null && flag.defaultIntValue !== undefined && (
          <>
            <dt className="text-gray-500">Default Value(Int)</dt>
            <dd>{flag.defaultIntValue}</dd>
          </>
        )}
        {flag.ownerNote && (
          <>
            <dt className="text-gray-500">Note</dt>
            <dd className="text-gray-600 col-span-1">{flag.ownerNote}</dd>
          </>
        )}
        <dt className="text-gray-500">Created</dt>
        <dd className="text-gray-500 text-xs">{flag.createdAt.toLocaleString("en-US")}</dd>
        <dt className="text-gray-500">Updated</dt>
        <dd className="text-gray-500 text-xs">{flag.updatedAt.toLocaleString("en-US")}</dd>
      </dl>
    </div>
  );
}
