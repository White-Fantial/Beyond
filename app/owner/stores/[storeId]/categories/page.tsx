import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { listOwnerCategories } from "@/services/owner/owner-catalog.service";

interface Props {
  params: { storeId: string };
}

export default async function StoreCategoriesPage({ params }: Props) {
  const { storeId } = params;
  await requireOwnerStoreAccess(storeId);
  const categories = await listOwnerCategories(storeId);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Categories</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Menu data is managed in Beyond. All fields can be edited here.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No categories found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Origin</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Order</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Online Visible</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">Subscription Visible</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">상품 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {cat.localUiColor && (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.localUiColor }}
                          />
                        )}
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {cat.originType ?? cat.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{cat.displayOrder}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${cat.isVisibleOnOnlineOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {cat.isVisibleOnOnlineOrder ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${cat.isVisibleOnSubscription ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {cat.isVisibleOnSubscription ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{cat.productCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        Category Edit API: PATCH /api/owner/stores/{storeId}/categories/[categoryId]
      </p>
    </div>
  );
}
