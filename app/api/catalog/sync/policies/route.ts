/**
 * GET  /api/catalog/sync/policies  — list sync policies for a connection
 * POST /api/catalog/sync/policies  — create a sync policy
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSyncPoliciesForConnection } from "@/services/catalog-sync-planner.service";
import type { CreateSyncPolicyInput } from "@/types/catalog-sync";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const policies = await getSyncPoliciesForConnection(connectionId);
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  let body: CreateSyncPolicyInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tenantId, storeId, connectionId, scope, direction, conflictStrategy, autoApplyMode } = body;

  if (!tenantId || !storeId || !connectionId || !scope || !direction || !conflictStrategy || !autoApplyMode) {
    return NextResponse.json(
      { error: "tenantId, storeId, connectionId, scope, direction, conflictStrategy, autoApplyMode are required" },
      { status: 400 }
    );
  }

  const policy = await prisma.catalogSyncPolicy.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      scope,
      fieldPath: body.fieldPath ?? null,
      direction,
      conflictStrategy,
      autoApplyMode,
      isEnabled: body.isEnabled ?? true,
      priority: body.priority ?? 100,
    },
  });

  return NextResponse.json({ policy }, { status: 201 });
}
