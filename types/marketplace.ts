import type { IngredientUnit } from "./owner-ingredients";
import type { RecipeYieldUnit } from "./owner-recipes";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MarketplaceRecipeType = "BASIC" | "PREMIUM";
export type MarketplaceRecipeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGE_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";
export type RecipeDifficulty = "EASY" | "MEDIUM" | "HARD";
export type RecipeReviewAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CHANGE_REQUESTED"
  | "REVISION_SUBMITTED"
  | "PUBLISHED"
  | "ARCHIVED";

export const MARKETPLACE_RECIPE_STATUS_LABELS: Record<
  MarketplaceRecipeStatus,
  string
> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  CHANGE_REQUESTED: "Change Requested",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export const RECIPE_DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

// ─── MarketplaceRecipe ────────────────────────────────────────────────────────

export interface MarketplaceRecipeIngredientItem {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  notes: string | null;
  unitCostSnapshot: number; // cost per unit at the time the ingredient was saved (millicents)
  lineCost: number; // quantity × ingredient.unitCost (live — always reflects current ingredient price)
}

export interface MarketplaceRecipe {
  id: string;
  type: MarketplaceRecipeType;
  status: MarketplaceRecipeStatus;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  providerId: string | null;
  providerName: string | null;
  createdByUserId: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  servings: number | null;
  cuisineTag: string | null;
  difficulty: RecipeDifficulty | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  currency: string;
  estimatedCostPrice: number;
  recommendedPrice: number;
  salePrice: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceRecipeDetail extends MarketplaceRecipe {
  instructions: string | null;
  ingredients: MarketplaceRecipeIngredientItem[];
  ingredientCount: number;
}

export interface MarketplaceRecipeListResult {
  items: MarketplaceRecipe[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MarketplaceRecipeIngredientInput {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  notes?: string;
}

export interface CreateMarketplaceRecipeInput {
  type: MarketplaceRecipeType;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  servings?: number;
  cuisineTag?: string;
  difficulty?: RecipeDifficulty;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  currency?: string;
  recommendedPrice?: number;
  salePrice?: number;
  instructions?: string;
  ingredients?: MarketplaceRecipeIngredientInput[];
}

export interface UpdateMarketplaceRecipeInput {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  yieldQty?: number;
  yieldUnit?: RecipeYieldUnit;
  servings?: number;
  cuisineTag?: string;
  difficulty?: RecipeDifficulty;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  currency?: string;
  recommendedPrice?: number;
  salePrice?: number;
  instructions?: string;
  ingredients?: MarketplaceRecipeIngredientInput[];
}

export interface MarketplaceRecipeFilters {
  /** Full-text keyword search on title and description. */
  q?: string;
  type?: MarketplaceRecipeType;
  status?: MarketplaceRecipeStatus;
  cuisineTag?: string;
  difficulty?: RecipeDifficulty;
  providerId?: string;
  page?: number;
  pageSize?: number;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export interface MarketplaceRecipeReview {
  id: string;
  recipeId: string;
  reviewerId: string;
  reviewerName: string;
  action: RecipeReviewAction;
  notes: string | null;
  createdAt: string;
}

export interface ReviewActionInput {
  action: RecipeReviewAction;
  notes?: string;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export interface MarketplaceRecipePurchase {
  id: string;
  recipeId: string;
  buyerUserId: string;
  tenantId: string | null;
  pricePaid: number;
  currency: string;
  paymentRef: string | null;
  purchasedAt: string;
  refundedAt: string | null;
}

export interface PurchaseRecipeInput {
  tenantId?: string;
  paymentRef?: string;
}

export interface RecipeAccessResult {
  hasAccess: boolean;
  reason: "basic" | "purchased" | "provider" | "admin" | "not_purchased";
}

// ─── IngredientRequest ────────────────────────────────────────────────────────

export type IngredientRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DUPLICATE";

export const INGREDIENT_REQUEST_STATUS_LABELS: Record<
  IngredientRequestStatus,
  string
> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
};

export interface IngredientRequest {
  id: string;
  requestedByUserId: string;
  requestedByName: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  notes: string | null;
  status: IngredientRequestStatus;
  resolvedIngredientId: string | null;
  tempIngredientId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientRequestListResult {
  items: IngredientRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateIngredientRequestInput {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  notes?: string;
  tenantId?: string;
}

export interface ReviewIngredientRequestInput {
  status: "APPROVED" | "REJECTED" | "DUPLICATE";
  /** Required when status is APPROVED or DUPLICATE — the Ingredient id (scope=PLATFORM) to link. */
  resolvedIngredientId?: string;
  reviewNotes?: string;
}

export interface IngredientRequestFilters {
  status?: IngredientRequestStatus;
  requestedByUserId?: string;
  page?: number;
  pageSize?: number;
}

