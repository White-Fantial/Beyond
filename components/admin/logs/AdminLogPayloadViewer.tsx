"use client";

import { useState } from "react";

interface AdminLogPayloadViewerProps {
  title: string;
  data: Record<string, unknown> | null;
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }
  if (typeof value === "string") {
    if (value === "[REDACTED]") {
      return (
        <span className="bg-yellow-100 text-yellow-700 px-1 rounded font-mono text-xs">
          [REDACTED]
        </span>
      );
    }
    return <span className="text-emerald-700 break-all">&quot;{value}&quot;</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-600">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-green-600" : "text-red-500"}>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <div className="ml-4 border-l border-gray-200 pl-3 space-y-0.5">
        {value.map((item, i) => (
          <div key={i}>
            <span className="text-gray-400 text-xs mr-1">[{i}]</span>
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-gray-400">{"{}"}</span>;
    return (
      <div className={depth > 0 ? "ml-4 border-l border-gray-200 pl-3 space-y-0.5" : "space-y-0.5"}>
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-1 items-start">
            <span className="text-orange-600 font-mono text-xs shrink-0 mt-0.5">{k}:</span>
            <div className="flex-1 min-w-0">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-gray-700">{String(value)}</span>;
}

export default function AdminLogPayloadViewer({ title, data }: AdminLogPayloadViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
        <p className="text-sm text-gray-400 italic">No payload</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <span className="text-xs text-yellow-700 bg-yellow-100 border border-yellow-200 rounded px-1.5 py-0.5">
            민감Info 마스킹됨
          </span>
        </div>
        <span className="text-gray-400 text-xs">{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 overflow-x-auto text-xs font-mono max-h-[600px] overflow-y-auto">
          {renderValue(data)}
        </div>
      )}
    </div>
  );
}
