import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LightspeedCatalogAdapter } from "@/adapters/catalog/lightspeed.adapter";
import { createCatalogAdapter } from "@/adapters/catalog";

describe("LightspeedCatalogAdapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("maps menu items and modifier groups into FullCatalogPayload", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: "item-1", name: "Burger", category: "cat-1", modifier_group_ids: ["mg-1"] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "mg-1",
              name: "Toppings",
              options: [{ id: "opt-1", name: "Cheese", price: 100 }],
            },
          ],
        }),
      });

    const adapter = new LightspeedCatalogAdapter();
    const result = await adapter.fetchFullCatalog({
      connectionId: "conn-1",
      credentials: { accessToken: "token", businessUnitId: "bu-1" },
    });

    expect(result.products).toHaveLength(1);
    expect(result.categories).toEqual([{ externalId: "cat-1", raw: { id: "cat-1", name: "cat-1" } }]);
    expect(result.modifierGroups).toHaveLength(1);
    expect(result.modifierOptions).toEqual([
      { externalId: "opt-1", groupExternalId: "mg-1", raw: { id: "opt-1", name: "Cheese", price: 100 } },
    ]);
    expect(result.productCategoryLinks).toEqual([{ productExternalId: "item-1", categoryExternalId: "cat-1" }]);
    expect(result.productModifierGroupLinks).toEqual([{ productExternalId: "item-1", groupExternalId: "mg-1" }]);
  });

  it("registers LIGHTSPEED in catalog adapter factory", () => {
    const adapter = createCatalogAdapter("LIGHTSPEED");
    expect(adapter.provider).toBe("LIGHTSPEED");
  });
});
