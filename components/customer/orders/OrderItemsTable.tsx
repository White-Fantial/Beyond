import type { CustomerOrderItem } from "@/types/customer";

function fmtAmount(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency }).format(minor / 100);
}

interface OrderItemsTableProps {
  items: CustomerOrderItem[];
  currency: string;
}

export function OrderItemsTable({ items, currency }: OrderItemsTableProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No items.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <div key={item.id} className="py-3">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-900">{item.productName}</span>
              {item.quantity > 1 && (
                <span className="ml-1 text-xs text-gray-400">×{item.quantity}</span>
              )}
              {item.notes && (
                <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>
              )}
              {item.modifiers.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {item.modifiers.map((mod, idx) => (
                    <li key={idx} className="text-xs text-gray-500">
                      {mod.modifierGroupName ? `${mod.modifierGroupName}: ` : ""}
                      {mod.modifierOptionName}
                      {mod.totalPriceAmount > 0 && (
                        <span className="ml-1 text-gray-400">
                          +{fmtAmount(mod.totalPriceAmount, currency)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 text-sm font-medium text-gray-900">
              {fmtAmount(item.totalPriceAmount, currency)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
