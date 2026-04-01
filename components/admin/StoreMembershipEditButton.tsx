"use client";

import { useState } from "react";
import EditStoreMembershipDialog from "./EditStoreMembershipDialog";

interface Props {
  storeMembershipId: string;
  currentRole: string;
  currentStatus: string;
}

export default function StoreMembershipEditButton({ storeMembershipId, currentRole, currentStatus }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
      >
        Edit
      </button>
      <EditStoreMembershipDialog
        open={open}
        onClose={() => setOpen(false)}
        storeMembershipId={storeMembershipId}
        currentRole={currentRole}
        currentStatus={currentStatus}
      />
    </>
  );
}
