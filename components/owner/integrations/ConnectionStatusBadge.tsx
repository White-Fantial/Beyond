"use client";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "bg-green-100 text-green-700",
  CONNECTING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
  REAUTH_REQUIRED: "bg-orange-100 text-orange-700",
  NOT_CONNECTED: "bg-gray-100 text-gray-500",
  DISCONNECTED: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: "Connected",
  CONNECTING: "Connecting…",
  ERROR: "Error",
  REAUTH_REQUIRED: "Re-auth Required",
  NOT_CONNECTED: "Not Connected",
  DISCONNECTED: "Disconnected",
};

interface Props {
  status: string;
  className?: string;
}

export default function ConnectionStatusBadge({ status, className = "" }: Props) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style} ${className}`}
    >
      {label}
    </span>
  );
}
