# Platform ingredient pricing field removal review

Date: 2026-04-26

## Request reviewed
- Proposal: remove purchase unit and purchase price from platform ingredient records, and keep only the recipe usage unit on the ingredient.
- Rationale: supplier products already store package unit and package price, so ingredient unit pricing can be derived from linked supplier products.

## Current data model and behavior

### Ingredient model
- `Ingredient` currently stores recipe-facing attributes such as `name`, `category`, and `unit`.
- It does **not** store package purchase quantity or purchase price.

### Supplier product model
- `SupplierProduct` stores pricing and package metadata used for costing:
  - `referencePrice` (millicents)
  - `purchaseQty` (package quantity)
  - `unit` (package unit)

### Recipe costing logic
- Recipe services derive ingredient unit cost from linked supplier products with unit conversion:
  - Formula: `packagePrice / purchaseQty / conversionFactor(supplierUnit -> ingredientUnit)`
  - If unit conversion is incompatible (for example KG vs ML), cost resolves to `0`.
- This behavior exists in both owner recipe costing and marketplace recipe cost snapshot paths.

## Evaluation

### Is the proposed deletion direction valid?
Yes. The current implementation already follows this architecture: ingredient-level package purchase fields are not needed, while supplier-product pricing + package unit/qty are the source of truth for cost calculation.

### Benefits
- Avoids duplicated pricing data on ingredients.
- Reduces inconsistency risk between ingredient records and supplier product records.
- Keeps ingredient semantics focused on recipe usage unit only.

### Caveats / conditions to keep correctness
- At least one valid linked supplier product is needed to compute non-zero ingredient unit cost.
- Unit compatibility between supplier product unit and ingredient recipe unit must be maintained; incompatible units intentionally produce zero cost.
- Missing supplier pricing data will naturally degrade to zero-cost fallback in current logic.

## Conclusion
- The proposal is aligned with the existing codebase design and is recommended.
- No schema change is required at this time because ingredient-level purchase quantity/price fields are already absent, and costing already relies on supplier-product metadata.
