import type { BackofficeTopProduct } from "@/types/backoffice";

interface Props {
  products: BackofficeTopProduct[];
}

export default function ReportsTopProducts({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Top Products</h2>
        <p className="text-sm text-gray-400">No order items in this period.</p>
      </div>
    );
  }

  const maxLines = Math.max(...products.map((p) => p.lineCount), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Top Products</h2>
      <div className="space-y-3">
        {products.map((product, idx) => {
          const pct = (product.lineCount / maxLines) * 100;
          return (
            <div key={product.productName}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-4 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {product.productName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0 ml-2">
                  <span>{product.quantitySold} sold</span>
                  <span className="font-semibold text-gray-800">
                    {product.lineCount} orders
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
