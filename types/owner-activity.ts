// Owner Console Phase 7 — Team Activity & Audit type definitions

export interface ActivityFeedItem {
  id: string;
  createdAt: string; // ISO 8601
  action: string;
  targetType: string;
  targetId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  storeId: string | null;
  storeName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ActivityFeedResult {
  items: ActivityFeedItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RoleChangeEvent {
  id: string;
  createdAt: string; // ISO 8601
  action: string;
  targetId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  storeId: string | null;
  storeName: string | null;
  previousRole: string | null;
  newRole: string | null;
  targetUserName: string | null;
  targetUserEmail: string | null;
}

export interface RoleChangeResult {
  items: RoleChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SettingsChangeEvent {
  id: string;
  createdAt: string; // ISO 8601
  action: string;
  category: "store_profile" | "store_hours" | "operations" | "catalog" | "other";
  targetId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  storeId: string | null;
  storeName: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SettingsChangeResult {
  items: SettingsChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IntegrationChangeEvent {
  id: string;
  createdAt: string; // ISO 8601
  action: string;
  targetId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  storeId: string | null;
  storeName: string | null;
  provider: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IntegrationChangeResult {
  items: IntegrationChangeEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OwnerActivityFilters {
  storeId?: string;
  actorUserId?: string;
  startDate?: string; // ISO date YYYY-MM-DD
  endDate?: string; // ISO date YYYY-MM-DD
  page?: number;
  pageSize?: number;
}
