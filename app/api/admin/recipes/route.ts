import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { prisma } from "@/lib/prisma";
import type { CreateRecipeInput, RecipeYieldUnit } from "@/types/owner-recipes";
import { RECIPE_YIELD_UNIT_LABELS } from "@/types/owner-recipes";

const VALID_YIELD_UNITS = Object.keys(RECIPE_YIELD_UNIT_LABELS) as RecipeYieldUnit[];

export async function GET(req: NextRequest) {
  await requirePlatformAdmin();
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  if (storeId) {
    // List recipes for a specific store
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { tenantId: true },
    });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const where = { tenantId: store.tenantId, storeId, deletedAt: null };
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

    const storeNames = await prisma.store.findMany({
      where: { id: { in: [storeId] } },
      select: { id: true, name: true },
    });
    const storeNameMap = new Map(storeNames.map((s) => [s.id, s.name]));

    return NextResponse.json({
      data: {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          tenantId: r.tenantId,
          storeId: r.storeId,
          storeName: r.storeId ? (storeNameMap.get(r.storeId) ?? null) : null,
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

  // List all recipes across all tenants (admin view)
  const where = { deletedAt: null };
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

  // Fetch store names for the returned recipes (only for those that have a storeId)
  const storeIds = [...new Set(rows.map((r) => r.storeId).filter((id): id is string => id !== null))];
  const storeNames = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeNameMap = new Map(storeNames.map((s) => [s.id, s.name]));

  return NextResponse.json({
    data: {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        tenantId: r.tenantId,
        storeId: r.storeId,
        storeName: r.storeId ? (storeNameMap.get(r.storeId) ?? null) : null,
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
    // Platform-level recipes are not tied to any tenant or store (tenantId/storeId are null).
    const recipe = await prisma.recipe.create({
      data: {
        tenantId: null,
        storeId: null,
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
