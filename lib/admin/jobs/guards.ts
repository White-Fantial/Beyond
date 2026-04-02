/**
 * Safety guards for job types.
 *
 * Each job type has a risk level, and flags indicating whether manual run
 * and retry are permitted. HIGH-risk jobs are blocked in the admin console.
 */

import type { JobType, JobRunStatus } from "@prisma/client";

export type JobRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface JobTypeConfig {
  jobType: JobType;
  riskLevel: JobRiskLevel;
  isManualRunAllowed: boolean;
  isRetryAllowed: boolean;
  /** Confirmation message shown to admin before run. */
  confirmMessage: string;
  /** Additional warning for MEDIUM risk. */
  retryConfirmMessage: string;
  description: string;
}

export const JOB_TYPE_CONFIGS: Record<JobType, JobTypeConfig> = {
  CATALOG_SYNC: {
    jobType: "CATALOG_SYNC",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "선택한 Store의 Catalog를 Sync합니다. 기존 Catalog는 업데이트되고 새 항목이 Add됩니다.",
    retryConfirmMessage: "이 Catalog Sync 작업을 재실행합니다. 동일한 idempotency 규칙이 Apply됩니다.",
    description: "Loyverse에서 내부 Catalog로 All Sync를 실행합니다.",
  },
  CONNECTION_VALIDATE: {
    jobType: "CONNECTION_VALIDATE",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "선택한 연결의 자격 증명을 검증합니다. 안전한 읽기 전용 확인 작업입니다.",
    retryConfirmMessage: "이 연결 검증 작업을 재실행합니다.",
    description: "연결 자격 증명의 유효성을 안전하게 확인합니다.",
  },
  CONNECTION_REFRESH_CHECK: {
    jobType: "CONNECTION_REFRESH_CHECK",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "연결 토큰 갱신을 시도합니다. 기존 refresh 로직과 동일한 안전 장치가 Apply됩니다.",
    retryConfirmMessage: "이 토큰 갱신 작업을 재실행합니다. 기존 idempotency 규칙이 유지됩니다.",
    description: "만료 예정이거나 만료된 토큰을 안전하게 갱신합니다.",
  },
  ORDER_RECOVERY_RETRY: {
    jobType: "ORDER_RECOVERY_RETRY",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "이 주문을 POS로 재전송합니다. 기존 중복 방지 로직이 Apply되어 같은 주문이 두 번 생성되지 않습니다.",
    retryConfirmMessage: "이 주문 복구 작업을 재실행합니다. 기존 idempotency 규칙을 우회하지 않습니다.",
    description: "실패한 주문 POS 전송을 안전하게 재시도합니다.",
  },
  ORDER_RECONCILIATION_RETRY: {
    jobType: "ORDER_RECONCILIATION_RETRY",
    riskLevel: "MEDIUM",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "주문 조정을 재실행합니다. 중복 방지 로직이 Apply됩니다.",
    retryConfirmMessage: "이 주문 조정 재시도 작업을 재실행합니다. 기존 조정 안전 장치가 유지됩니다.",
    description: "POS 주문 조정을 안전하게 재시도합니다.",
  },
  ANALYTICS_REBUILD: {
    jobType: "ANALYTICS_REBUILD",
    riskLevel: "LOW",
    isManualRunAllowed: true,
    isRetryAllowed: true,
    confirmMessage: "선택한 Store의 분석 요약을 재빌드합니다.",
    retryConfirmMessage: "이 분석 재빌드 작업을 재실행합니다.",
    description: "Store 매출 요약 및 집계 데이터를 재생성합니다.",
  },
};

/** Returns true if a job type can be manually triggered in the admin console. */
export function canManuallyRunJobType(jobType: JobType): boolean {
  const config = JOB_TYPE_CONFIGS[jobType];
  return config?.isManualRunAllowed === true && config?.riskLevel !== "HIGH";
}

/** Returns true if a failed job run can be retried. */
export function canRetryJobRun(status: JobRunStatus, jobType: JobType): boolean {
  if (status !== "FAILED") return false;
  const config = JOB_TYPE_CONFIGS[jobType];
  return config?.isRetryAllowed === true && config?.riskLevel !== "HIGH";
}

/** Returns the list of job types that are allowed in the admin console. */
export function getAllowedJobTypes(): JobType[] {
  return (Object.keys(JOB_TYPE_CONFIGS) as JobType[]).filter(
    (jt) => JOB_TYPE_CONFIGS[jt].riskLevel !== "HIGH"
  );
}
