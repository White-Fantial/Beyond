"use client";

import { useState } from "react";
import EditStoreDialog from "./EditStoreDialog";
import CreateStoreMembershipDialog from "./CreateStoreMembershipDialog";

interface StoreData {
  id: string;
  name: string;
  displayName: string;
  timezone: string;
  currency: string;
  countryCode: string;
  status: string;
}

interface TenantMembershipOption {
  id: string;
  userName: string;
  userEmail: string;
}

interface Props {
  store: StoreData;
  tenantMemberships: TenantMembershipOption[];
}

export default function StoreDetailActions({ store, tenantMemberships }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          ✏️ 매장 편집
        </button>
        <button
          onClick={() => setMembershipOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          + 멤버십 추가
        </button>
      </div>

      <EditStoreDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        storeId={store.id}
        initialData={{
          name: store.name,
          displayName: store.displayName,
          timezone: store.timezone,
          currency: store.currency,
          countryCode: store.countryCode,
          status: store.status,
        }}
      />
      <CreateStoreMembershipDialog
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        storeId={store.id}
        tenantMemberships={tenantMemberships}
      />
    </>
  );
}
