import { labelFlagStatus, flagStatusColor } from "@/lib/flags/labels";
import type { FlagStatus } from "@/types/feature-flags";

interface Props {
  status: FlagStatus;
}

export default function AdminFeatureFlagStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${flagStatusColor(status)}`}
    >
      {labelFlagStatus(status)}
    </span>
  );
}
