"use client";

interface Props {
  href: string;
  label?: string;
  className?: string;
}

/**
 * A simple anchor-based export button.
 * The `href` should point to an export API route (e.g. /api/owner/reports/export?format=csv).
 * The browser will follow the link and receive the file via Content-Disposition: attachment.
 */
export default function ExportButton({ href, label = "Export CSV", className = "" }: Props) {
  return (
    <a
      href={href}
      download
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </a>
  );
}
