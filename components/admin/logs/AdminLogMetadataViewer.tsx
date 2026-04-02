"use client";

import { useState } from "react";

interface AdminLogMetadataViewerProps {
  title: string;
  data: Record<string, unknown> | null;
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green-600" : "text-red-600"}>{String(value)}</span>
    );
  }
  if (typeof value === "number") {
    return <span className="text-blue-600">{String(value)}</span>;
  }
  if (typeof value === "string") {
    if (value === "[REDACTED]") {
      return (
        <span className="bg-yellow-100 text-yellow-700 px-1 rounded font-mono text-xs">
          [REDACTED]
        </span>
      );
    }
    return <span className="text-gray-800 break-all">&quot;{value}&quot;</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <div className="ml-3 border-l border-gray-200 pl-3">
        {value.map((item, i) => (
          <div key={i} className="py-0.5">
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
      <div className={depth > 0 ? "ml-3 border-l border-gray-200 pl-3" : ""}>
        {entries.map(([k, v]) => (
          <div key={k} className="py-0.5 flex gap-1 items-start">
            <span className="text-purple-600 text-xs font-mono shrink-0 mt-0.5">{k}:</span>
            <div className="flex-1 min-w-0">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

export default function AdminLogMetadataViewer({ title, data }: AdminLogMetadataViewerProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
        <p className="text-sm text-gray-400 italic">No data</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <span className="text-gray-400 text-xs">{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 overflow-x-auto text-xs font-mono">
          {renderValue(data)}
        </div>
      )}
    </div>
  );
}
