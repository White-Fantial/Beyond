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
        구독 정보가 없습니다.{" "}
        <Link href={`/admin/billing/plans`} className="text-blue-600 hover:underline">
          플랜을 할당하세요.
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
        <div>
          <span className="text-xs text-gray-500">플랜</span>
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
          <span className="text-xs text-gray-500">상태</span>
          <div>
            <StatusBadge
              value={subscription.status}
              label={labelSubscriptionStatus(subscription.status)}
            />
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500">결제 주기</span>
          <div className="font-medium">{labelBillingInterval(subscription.billingInterval)}</div>
        </div>

        <div>
          <span className="text-xs text-gray-500">구독 시작일</span>
          <div className="font-medium">
            {new Date(subscription.startedAt).toLocaleDateString("ko-KR")}
          </div>
        </div>

        {subscription.trialStart && (
          <div>
            <span className="text-xs text-gray-500">트라이얼 시작</span>
            <div className="font-medium">
              {new Date(subscription.trialStart).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.trialEnd && (
          <div>
            <span className="text-xs text-gray-500">트라이얼 종료</span>
            <div className="font-medium">
              {new Date(subscription.trialEnd).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.currentPeriodStart && (
          <div>
            <span className="text-xs text-gray-500">현재 기간 시작</span>
            <div className="font-medium">
              {new Date(subscription.currentPeriodStart).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.currentPeriodEnd && (
          <div>
            <span className="text-xs text-gray-500">현재 기간 종료</span>
            <div className="font-medium">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="col-span-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              기간 종료 시 취소 예정
            </span>
          </div>
        )}

        {subscription.externalSubscriptionRef && (
          <div className="col-span-2">
            <span className="text-xs text-gray-500">외부 구독 ID</span>
            <div className="font-mono text-xs text-gray-600">{subscription.externalSubscriptionRef}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setChangePlanOpen(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          플랜 변경
        </button>
        {subscription.status === "TRIAL" && (
          <button
            onClick={() => setExtendTrialOpen(true)}
            className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
          >
            트라이얼 연장
          </button>
        )}
        <button
          onClick={() => setChangeStatusOpen(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          상태 변경
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
