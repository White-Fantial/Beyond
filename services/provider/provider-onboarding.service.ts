/**
 * Provider Onboarding Service — Marketplace Phase 7.
 *
 * Handles the recipe-provider application lifecycle:
 *   1. User submits an application (applyForProvider)
 *   2. Admin lists and reviews applications (listApplications / reviewApplication)
 *   3. On APPROVED: platformRole → RECIPE_PROVIDER + providerApprovedAt set
 *   4. Provider then connects Stripe via lib/stripe/connect.ts helpers
 */
import { prisma } from "@/lib/prisma";
import type {
  ProviderOnboardingApplication,
  ProviderApplicationListResult,
  ApplyForProviderInput,
  ReviewProviderApplicationInput,
  ProviderApplicationFilters,
  ProviderApplicationStatus,
  ProviderBusinessType,
  ProviderStripeStatus,
} from "@/types/provider-onboarding";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawApplication = {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  taxId: string | null;
  portfolioUrl: string | null;
  introduction: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  applicant?: { name: string; email: string } | null;
};

function toApplication(row: RawApplication): ProviderOnboardingApplication {
  return {
    id: row.id,
    userId: row.userId,
    applicantName: row.applicant?.name ?? "",
    applicantEmail: row.applicant?.email ?? "",
    businessName: row.businessName,
    businessType: row.businessType as ProviderBusinessType,
    taxId: row.taxId,
    portfolioUrl: row.portfolioUrl,
    introduction: row.introduction,
    status: row.status as ProviderApplicationStatus,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByUserId: row.reviewedByUserId,
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Submit a provider application.
 * A user can only have one PENDING or APPROVED application at a time.
 */
export async function applyForProvider(
  userId: string,
  input: ApplyForProviderInput
): Promise<ProviderOnboardingApplication> {
  // Check for an existing active application
  const existing = await prisma.providerOnboardingApplication.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    throw new Error(
      existing.status === "APPROVED"
        ? "User is already an approved recipe provider"
        : "A pending application already exists"
    );
  }

  const row = await prisma.providerOnboardingApplication.create({
    data: {
      userId,
      businessName: input.businessName.trim(),
      businessType: input.businessType ?? "INDIVIDUAL",
      taxId: input.taxId?.trim() ?? null,
      portfolioUrl: input.portfolioUrl?.trim() ?? null,
      introduction: input.introduction?.trim() ?? null,
    },
    include: { applicant: { select: { name: true, email: true } } },
  });

  // Record the applied-at timestamp on the user
  await prisma.user.update({
    where: { id: userId },
    data: { providerAppliedAt: new Date() },
  });

  return toApplication(row);
}

/** Get the latest application for a user (most recent, any status). */
export async function getUserApplication(
  userId: string
): Promise<ProviderOnboardingApplication | null> {
  const row = await prisma.providerOnboardingApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { applicant: { select: { name: true, email: true } } },
  });
  return row ? toApplication(row) : null;
}

/** Admin: list all applications with optional status filter. */
export async function listApplications(
  filters: ProviderApplicationFilters = {}
): Promise<ProviderApplicationListResult> {
  const { status, page = 1, pageSize = 20 } = filters;
  const skip = (page - 1) * pageSize;

  const where = status ? { status } : {};

  const [rows, total] = await Promise.all([
    prisma.providerOnboardingApplication.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { applicant: { select: { name: true, email: true } } },
    }),
    prisma.providerOnboardingApplication.count({ where }),
  ]);

  return {
    items: rows.map(toApplication),
    total,
    page,
    pageSize,
  };
}

/** Admin: get a single application by ID. */
export async function getApplication(
  id: string
): Promise<ProviderOnboardingApplication> {
  const row = await prisma.providerOnboardingApplication.findUnique({
    where: { id },
    include: { applicant: { select: { name: true, email: true } } },
  });
  if (!row) throw new Error(`ProviderOnboardingApplication ${id} not found`);
  return toApplication(row);
}

/**
 * Admin: review an application.
 * On APPROVED: sets platformRole to RECIPE_PROVIDER and records providerApprovedAt.
 * On REJECTED: leaves the platformRole unchanged.
 */
export async function reviewApplication(
  id: string,
  reviewerUserId: string,
  input: ReviewProviderApplicationInput
): Promise<ProviderOnboardingApplication> {
  const existing = await prisma.providerOnboardingApplication.findUnique({
    where: { id },
    select: { status: true, userId: true },
  });
  if (!existing) throw new Error(`ProviderOnboardingApplication ${id} not found`);
  if (existing.status !== "PENDING") {
    throw new Error(`Application ${id} has already been reviewed`);
  }

  const now = new Date();

  const row = await prisma.providerOnboardingApplication.update({
    where: { id },
    data: {
      status: input.status,
      adminNotes: input.adminNotes ?? null,
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
    },
    include: { applicant: { select: { name: true, email: true } } },
  });

  if (input.status === "APPROVED") {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        platformRole: "RECIPE_PROVIDER",
        providerApprovedAt: now,
      },
    });
  }

  return toApplication(row);
}

/** Get a provider's Stripe Connect status. */
export async function getProviderStripeStatus(
  userId: string
): Promise<ProviderStripeStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeConnectAccountId: true,
      stripeConnectOnboarded: true,
      stripeConnectPayoutsEnabled: true,
    },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  return {
    hasAccount: !!user.stripeConnectAccountId,
    accountId: user.stripeConnectAccountId,
    onboarded: user.stripeConnectOnboarded,
    payoutsEnabled: user.stripeConnectPayoutsEnabled,
  };
}
