/**
 * PATCH /api/catalog/sync/policies/[policyId] — update a sync policy
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UpdateSyncPolicyInput } from "@/types/catalog-sync";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { policyId: string } }
) {
  const { policyId } = params;

  let body: UpdateSyncPolicyInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.catalogSyncPolicy.findUnique({ where: { id: policyId } });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const updated = await prisma.catalogSyncPolicy.update({
    where: { id: policyId },
    data: {
      ...(body.direction !== undefined && { direction: body.direction }),
      ...(body.conflictStrategy !== undefined && { conflictStrategy: body.conflictStrategy }),
      ...(body.autoApplyMode !== undefined && { autoApplyMode: body.autoApplyMode }),
      ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
      ...(body.priority !== undefined && { priority: body.priority }),
    },
  });

  return NextResponse.json({ policy: updated });
}
