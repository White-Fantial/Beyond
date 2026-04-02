"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminChangePlanDialog from "@/components/admin/billing/AdminChangePlanDialog";
import AdminExtendTrialDialog from "@/components/admin/billing/AdminExtendTrialDialog";
import AdminChangeSubscriptionStatusDialog from "@/components/admin/billing/AdminChangeSubscriptionStatusDialog";
import { labelSubscriptionStatus, labelBillingInterval } from "@/lib/billing/labels";
import type { AdminTenantBillingDetail, SubscriptionStatus } from "@/types/admin-billing";

interface Plan {
  id: string;
  code: string;
  name: string;
}

interface Props {
  subscription: AdminTenantBillingDetail["subscription"];
  tenantId: string;
  availablePlans: Plan[];
}

export default function AdminTenantSubscriptionCard({ subscription, tenantId, availablePlans }: Props) {
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);

  if (!subscription) {
    return (
      <div className="text-sm text-gray-400">
        No subscription info.{" "}
        <Link href={`/admin/billing/plans`} className="text-blue-600 hover:underline">
          Assign a plan.
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
        <div>
          <span className="text-xs text-gray-500">Plan</span>
          <div className="font-medium">
            <Link
              href={`/admin/billing/plans/${subscription.planId}`}
              className="text-blue-600 hover:underline"
            >
              {subscription.planName}
            </Link>
            <span className="ml-1.5 font-mono text-xs text-gray-400">{subscription.planCode}</span>
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500">Status</span>
          <div>
            <StatusBadge
              value={subscription.status}
              label={labelSubscriptionStatus(subscription.status)}
            />
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500">Billing Cycle</span>
          <div className="font-medium">{labelBillingInterval(subscription.billingInterval)}</div>
        </div>

        <div>
          <span className="text-xs text-gray-500">Subscription Start</span>
          <div className="font-medium">
            {new Date(subscription.startedAt).toLocaleDateString("ko-KR")}
          </div>
        </div>

        {subscription.trialStart && (
          <div>
            <span className="text-xs text-gray-500">Trial Start</span>
            <div className="font-medium">
              {new Date(subscription.trialStart).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.trialEnd && (
          <div>
            <span className="text-xs text-gray-500">Trial End</span>
            <div className="font-medium">
              {new Date(subscription.trialEnd).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.currentPeriodStart && (
          <div>
            <span className="text-xs text-gray-500">Current Period Start</span>
            <div className="font-medium">
              {new Date(subscription.currentPeriodStart).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.currentPeriodEnd && (
          <div>
            <span className="text-xs text-gray-500">Current Period End</span>
            <div className="font-medium">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="col-span-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              Period 종료 시 Cancel 예정
            </span>
          </div>
        )}

        {subscription.externalSubscriptionRef && (
          <div className="col-span-2">
            <span className="text-xs text-gray-500">External Subscription ID</span>
            <div className="font-mono text-xs text-gray-600">{subscription.externalSubscriptionRef}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setChangePlanOpen(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Change Plan
        </button>
        {subscription.status === "TRIAL" && (
          <button
            onClick={() => setExtendTrialOpen(true)}
            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
          >
            Extend Trial
          </button>
        )}
        <button
          onClick={() => setChangeStatusOpen(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          Change Status
        </button>
      </div>

      <AdminChangePlanDialog
        open={changePlanOpen}
        onClose={() => setChangePlanOpen(false)}
        tenantId={tenantId}
        subscriptionId={subscription.id}
        currentPlanId={subscription.planId}
        plans={availablePlans}
      />
      <AdminExtendTrialDialog
        open={extendTrialOpen}
        onClose={() => setExtendTrialOpen(false)}
        tenantId={tenantId}
        subscriptionId={subscription.id}
      />
      <AdminChangeSubscriptionStatusDialog
        open={changeStatusOpen}
        onClose={() => setChangeStatusOpen(false)}
        tenantId={tenantId}
        subscriptionId={subscription.id}
        currentStatus={subscription.status as SubscriptionStatus}
      />
    </>
  );
}
