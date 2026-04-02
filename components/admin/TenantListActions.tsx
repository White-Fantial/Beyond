"use client";

import { useState } from "react";
import CreateTenantDialog from "./CreateTenantDialog";

export default function TenantListActions() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        + Create tenant
      </button>
      <CreateTenantDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
