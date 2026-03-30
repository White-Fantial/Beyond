import type {
  LoyverseCategoriesResponse,
  LoyverseModifiersResponse,
  LoyverseItemsResponse,
  LoyverseCategory,
  LoyverseModifierGroup,
  LoyverseItem,
} from "./types";

const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0";

export class LoyverseClient {
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${LOYVERSE_API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Loyverse API error ${res.status} on ${path}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async fetchAllCategories(): Promise<LoyverseCategory[]> {
    const all: LoyverseCategory[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: "250" };
      if (cursor) params.cursor = cursor;

      const res = await this.get<LoyverseCategoriesResponse>("/categories", params);
      all.push(...res.categories);
      cursor = res.cursor;
    } while (cursor);

    return all;
  }

  async fetchAllModifierGroups(): Promise<LoyverseModifierGroup[]> {
    const all: LoyverseModifierGroup[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: "250" };
      if (cursor) params.cursor = cursor;

      const res = await this.get<LoyverseModifiersResponse>("/modifiers", params);
      all.push(...res.modifiers);
      cursor = res.cursor;
    } while (cursor);

    return all;
  }

  async fetchAllItems(): Promise<LoyverseItem[]> {
    const all: LoyverseItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: "250" };
      if (cursor) params.cursor = cursor;

      const res = await this.get<LoyverseItemsResponse>("/items", params);
      all.push(...res.items);
      cursor = res.cursor;
    } while (cursor);

    return all;
  }
}
