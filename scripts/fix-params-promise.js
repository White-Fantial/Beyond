#!/usr/bin/env node
/**
 * Fix Next.js 15 route handler params type errors.
 * In Next.js 15, params is a Promise and must be awaited.
 *
 * Transforms:
 *   params: { storeId: string }  →  params: Promise<{ storeId: string }>
 *   = params;                    →  = await params;
 *   params.xxx                   →  (await params).xxx
 */

const fs = require("fs");
const path = require("path");

const filesToFix = [
  "app/api/admin/compliance/users/[userId]/erasure/route.ts",
  "app/api/admin/compliance/users/[userId]/export/route.ts",
  "app/api/admin/feature-flags/[flagKey]/assignments/[assignmentId]/route.ts",
  "app/api/admin/feature-flags/[flagKey]/assignments/route.ts",
  "app/api/admin/feature-flags/[flagKey]/route.ts",
  "app/api/catalog/conflicts/[conflictId]/ignore/route.ts",
  "app/api/catalog/conflicts/[conflictId]/resolve/route.ts",
  "app/api/catalog/conflicts/[conflictId]/route.ts",
  "app/api/catalog/conflicts/[conflictId]/start-review/route.ts",
  "app/api/catalog/external-changes/[changeId]/acknowledge/route.ts",
  "app/api/catalog/external-changes/[changeId]/ignore/route.ts",
  "app/api/catalog/external-changes/[changeId]/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/apply/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/fields/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/generate-plan/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/preview/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/reset/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/structures/route.ts",
  "app/api/catalog/merge-drafts/[draftId]/validate/route.ts",
  "app/api/catalog/publish/jobs/[jobId]/retry/route.ts",
  "app/api/catalog/publish/jobs/[jobId]/route.ts",
  "app/api/catalog/sync/plan-items/[planItemId]/retry/route.ts",
  "app/api/catalog/sync/plans/[planId]/apply/route.ts",
  "app/api/catalog/sync/plans/[planId]/cancel/route.ts",
  "app/api/catalog/sync/plans/[planId]/preview/route.ts",
  "app/api/catalog/sync/plans/[planId]/route.ts",
  "app/api/catalog/sync/policies/[policyId]/route.ts",
  "app/api/customer/addresses/[addressId]/route.ts",
  "app/api/customer/addresses/[addressId]/set-default/route.ts",
  "app/api/customer/notifications/[notificationId]/read/route.ts",
  "app/api/customer/orders/[orderId]/route.ts",
  "app/api/customer/payment-methods/[methodId]/route.ts",
  "app/api/customer/payment-methods/[methodId]/set-default/route.ts",
  "app/api/customer/subscriptions/[subscriptionId]/cancel/route.ts",
  "app/api/customer/subscriptions/[subscriptionId]/next-date/route.ts",
  "app/api/customer/subscriptions/[subscriptionId]/pause/route.ts",
  "app/api/customer/subscriptions/[subscriptionId]/resume/route.ts",
  "app/api/integrations/callback/[provider]/route.ts",
  "app/api/owner/alert-rules/[ruleId]/route.ts",
  "app/api/owner/billing/invoices/[invoiceId]/route.ts",
  "app/api/owner/customers/[customerId]/notes/route.ts",
  "app/api/owner/customers/[customerId]/orders/route.ts",
  "app/api/owner/customers/[customerId]/route.ts",
  "app/api/owner/customers/[customerId]/subscriptions/route.ts",
  "app/api/owner/gift-cards/[giftCardId]/route.ts",
  "app/api/owner/gift-cards/[giftCardId]/void/route.ts",
  "app/api/owner/ingredients/[ingredientId]/route.ts",
  "app/api/owner/ingredients/[ingredientId]/supplier-links/[linkId]/route.ts",
  "app/api/owner/ingredients/[ingredientId]/supplier-links/route.ts",
  "app/api/owner/integrations/[connectionId]/disconnect/route.ts",
  "app/api/owner/integrations/[connectionId]/sync/route.ts",
  "app/api/owner/notifications/[notificationId]/read/route.ts",
  "app/api/owner/recipes/[recipeId]/route.ts",
  "app/api/owner/scrape/base-price/[productId]/route.ts",
  "app/api/owner/stores/[storeId]/catalog-settings/route.ts",
  "app/api/owner/stores/[storeId]/categories/[categoryId]/route.ts",
  "app/api/owner/stores/[storeId]/hours/route.ts",
  "app/api/owner/stores/[storeId]/modifier-options/[optionId]/route.ts",
  "app/api/owner/stores/[storeId]/operations/route.ts",
  "app/api/owner/stores/[storeId]/products/[productId]/route.ts",
  "app/api/owner/stores/[storeId]/reports/route.ts",
  "app/api/owner/stores/[storeId]/settings/operations/route.ts",
  "app/api/owner/stores/[storeId]/settings/route.ts",
  "app/api/owner/stores/[storeId]/staff/[membershipId]/route.ts",
  "app/api/owner/stores/[storeId]/staff/route.ts",
  "app/api/owner/subscriptions/[subscriptionId]/cancel/route.ts",
  "app/api/owner/subscriptions/[subscriptionId]/next-date/route.ts",
  "app/api/owner/subscriptions/[subscriptionId]/note/route.ts",
  "app/api/owner/subscriptions/[subscriptionId]/pause/route.ts",
  "app/api/owner/subscriptions/[subscriptionId]/resume/route.ts",
  "app/api/owner/supplier-credentials/[credentialId]/route.ts",
  "app/api/owner/supplier-credentials/[credentialId]/verify/route.ts",
  "app/api/owner/supplier-products/[productId]/base-price/route.ts",
  "app/api/owner/suppliers/[supplierId]/products/[productId]/route.ts",
  "app/api/owner/suppliers/[supplierId]/products/[productId]/scrape/route.ts",
  "app/api/owner/suppliers/[supplierId]/products/route.ts",
  "app/api/owner/suppliers/[supplierId]/route.ts",
  "app/api/owner/suppliers/[supplierId]/scrape/route.ts",
  "app/api/owner/team/[membershipId]/route.ts",
  "app/api/owner/webhooks/[endpointId]/deliveries/route.ts",
  "app/api/owner/webhooks/[endpointId]/route.ts",
  "app/api/owner/webhooks/[endpointId]/toggle/route.ts",
  "app/api/store/[storeSlug]/gift-card/validate/route.ts",
  "app/api/store/[storeSlug]/orders/[orderId]/route.ts",
  "app/api/store/[storeSlug]/orders/route.ts",
  "app/api/store/[storeSlug]/product/[productId]/route.ts",
  "app/api/store/[storeSlug]/promo/validate/route.ts",
  "app/api/store/[storeSlug]/subscriptions/[subscriptionId]/route.ts",
  "app/api/store/[storeSlug]/subscriptions/route.ts",
  // Additional marketplace/admin/provider routes
  "app/api/marketplace/recipes/[id]/route.ts",
  "app/api/marketplace/recipes/[id]/access/route.ts",
  "app/api/marketplace/recipes/[id]/purchase/intent/route.ts",
  "app/api/marketplace/recipes/[id]/purchase/route.ts",
  "app/api/marketplace/recipes/[id]/review/route.ts",
  "app/api/marketplace/recipes/[id]/publish/route.ts",
  "app/api/marketplace/recipes/[id]/submit/route.ts",
  "app/api/marketplace/recipes/[id]/copy/route.ts",
  "app/api/admin/ingredient-requests/[id]/review/route.ts",
  "app/api/admin/provider-applications/[id]/review/route.ts",
  "app/api/admin/platform-ingredients/[id]/route.ts",
];

let fixed = 0;
let skipped = 0;
let missing = 0;
let unchanged = 0;

for (const relPath of filesToFix) {
  const filePath = path.join(__dirname, "..", relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`MISSING:   ${relPath}`);
    missing++;
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already fully converted to Promise params
  if (
    content.includes("params: Promise<{") &&
    !content.match(/\bparams: \{(?![^}]*Promise)/)
  ) {
    console.log(`SKIP:      ${relPath}`);
    skipped++;
    continue;
  }

  const original = content;

  // Step 1: Fix params type declarations (interface and inline)
  // Replace `params: { ... }` with `params: Promise<{ ... }>`
  // Uses a non-greedy match within single-level braces
  content = content.replace(
    /params:\s*\{([^{}]+)\}/g,
    (match, inner) => {
      // Don't double-wrap if already a Promise
      if (match.includes("Promise<")) return match;
      return `params: Promise<{${inner}}>`;
    }
  );

  // Step 2a: Fix destructuring in function body: `const { ... } = params;` → `= await params;`
  content = content.replace(/\b(=\s*)params;/g, "$1await params;");

  // Step 2b: Fix direct property access: `params.xxx` → `(await params).xxx`
  content = content.replace(/\bparams\.([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, "(await params).$1");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`FIXED:     ${relPath}`);
    fixed++;
  } else {
    console.log(`NO CHANGE: ${relPath}`);
    unchanged++;
  }
}

console.log(`\nSummary: ${fixed} fixed, ${skipped} skipped, ${unchanged} no change, ${missing} missing`);
