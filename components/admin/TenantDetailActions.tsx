"use client";

import { useState } from "react";
import EditTenantDialog from "./EditTenantDialog";
import CreateStoreDialog from "./CreateStoreDialog";
import CreateTenantMembershipDialog from "./CreateTenantMembershipDialog";

interface TenantData {
  id: string;
  legalName: string;
  displayName: string;
  timezone: string;
  currency: string;
  countryCode: string;
  status: string;
}

interface Props {
  tenant: TenantData;
}

export default function TenantDetailActions({ tenant }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          ✏️ 테넌트 편집
        </button>
        <button
          onClick={() => setStoreOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          + 매장 추가
        </button>
        <button
          onClick={() => setMembershipOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          + 멤버십 추가
        </button>
      </div>

      <EditTenantDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tenantId={tenant.id}
        initialData={{
          legalName: tenant.legalName,
          displayName: tenant.displayName,
          timezone: tenant.timezone,
          currency: tenant.currency,
          countryCode: tenant.countryCode,
          status: tenant.status,
        }}
      />
      <CreateStoreDialog
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        tenantId={tenant.id}
      />
      <CreateTenantMembershipDialog
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        tenantId={tenant.id}
      />
    </>
  );
}
