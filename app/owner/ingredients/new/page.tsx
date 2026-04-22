import { redirect } from "next/navigation";

/**
 * Direct ingredient creation is no longer available for owners.
 * Owners submit ingredient requests via the Ingredients page.
 */
export default function NewIngredientPage() {
  redirect("/owner/ingredients");
}

