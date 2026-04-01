"use client";

import { useState } from "react";
import EditMembershipDialog from "./EditMembershipDialog";

interface Props {
  membershipId: string;
  currentRole: string;
  currentStatus: string;
}

export default function MembershipEditButton({ membershipId, currentRole, currentStatus }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
      >
        편집
      </button>
      <EditMembershipDialog
        open={open}
        onClose={() => setOpen(false)}
        membershipId={membershipId}
        currentRole={currentRole}
        currentStatus={currentStatus}
      />
    </>
  );
}
