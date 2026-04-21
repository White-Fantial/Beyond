import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listPlatformIngredients } from "@/services/marketplace/platform-ingredients.service";
import AdminPlatformIngredientsClient from "./AdminPlatformIngredientsClient";

export default async function AdminPlatformIngredientsPage() {
  await requirePlatformAdmin();

  const result = await listPlatformIngredients({ pageSize: 200 });

  return <AdminPlatformIngredientsClient initialItems={result.items} />;
}
