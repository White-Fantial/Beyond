import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import type { CreateRecipeInput, RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

const VALID_YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

export async function GET(req: NextRequest) {
  await requirePlatformAdmin();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") ?? searchParams.get("storeId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const where = {
    deletedAt: null,
    ...(tenantId ? { tenantId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        catalogProduct: { select: { name: true, basePriceAmount: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);

  // Fetch tenant display names for recipes that have a tenantId
  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter((id): id is string => id !== null))];
  const tenantRows = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, displayName: true },
  });
  const tenantNameMap = new Map(tenantRows.map((t) => [t.id, t.displayName]));

  return NextResponse.json({
    data: {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        tenantId: r.tenantId,
        tenantName: r.tenantId ? (tenantNameMap.get(r.tenantId) ?? null) : null,
        categoryId: r.categoryId,
        categoryName: r.category?.name ?? null,
        yieldQty: r.yieldQty,
        yieldUnit: r.yieldUnit,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    },
  });
}

export async function POST(req: NextRequest) {
  await requirePlatformAdmin();

  const body = (await req.json()) as CreateRecipeInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.yieldQty || body.yieldQty < 1) {
    return NextResponse.json({ error: "yieldQty must be at least 1" }, { status: 400 });
  }
  if (!body.yieldUnit || !VALID_YIELD_UNITS.includes(body.yieldUnit as RecipeYieldUnit)) {
    return NextResponse.json({ error: "Invalid yieldUnit provided" }, { status: 400 });
  }

  try {
    // Platform-level recipes are not tied to any tenant (tenantId is null).
    const recipe = await prisma.recipe.create({
      data: {
        tenantId: null,
        name: body.name.trim(),
        yieldQty: body.yieldQty,
        yieldUnit: body.yieldUnit,
        notes: body.notes ?? null,
        instructions: body.instructions ?? null,
        categoryId: body.categoryId ?? null,
        ingredients: {
          create: (body.ingredients ?? []).map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
    });
    return NextResponse.json({ data: recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
