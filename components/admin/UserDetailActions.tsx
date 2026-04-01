"use client";

import { useState } from "react";
import EditUserDialog from "./EditUserDialog";
import ChangePlatformRoleDialog from "./ChangePlatformRoleDialog";
import CreateTenantMembershipDialog from "./CreateTenantMembershipDialog";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: string;
}

interface Props {
  user: UserData;
}

export default function UserDetailActions({ user }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          ✏️ Edit user
        </button>
        <button
          onClick={() => setRoleOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          🔑 Change platform role
        </button>
        <button
          onClick={() => setMembershipOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          + Add tenant membership
        </button>
      </div>

      <EditUserDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={user.id}
        initialData={{ name: user.name, email: user.email, phone: user.phone }}
      />
      <ChangePlatformRoleDialog
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        userId={user.id}
        currentRole={user.platformRole}
      />
      <CreateTenantMembershipDialog
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        userId={user.id}
      />
    </>
  );
}
