import type { CustomerStore } from "@/services/customer-menu.service";

interface StoreHeaderProps {
  store: CustomerStore;
  pickupLabel: string;
  onPickupTimeClick?: () => void;
  cartButton?: React.ReactNode;
}

export default function StoreHeader({
  store,
  pickupLabel,
  onPickupTimeClick,
  cartButton,
}: StoreHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {store.displayName || store.name}
          </h1>
          <button
            onClick={onPickupTimeClick}
            className="mt-1 flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
            aria-label="Change pickup time"
          >
            <span>🕐</span>
            <span className="font-medium">{pickupLabel}</span>
            <span className="text-gray-400">›</span>
          </button>
        </div>
        <div className="flex-shrink-0">{cartButton}</div>
      </div>
    </header>
  );
}
