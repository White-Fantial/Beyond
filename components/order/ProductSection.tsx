import type { CustomerProduct } from "@/services/customer-menu.service";
import ProductCard from "./ProductCard";

interface ProductSectionProps {
  categoryId: string;
  categoryName: string;
  products: CustomerProduct[];
  onAddProduct: (product: CustomerProduct) => void;
}

export default function ProductSection({
  categoryId,
  categoryName,
  products,
  onAddProduct,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section
      id={`category-${categoryId}`}
      aria-labelledby={`category-title-${categoryId}`}
      className="px-4 pt-4 pb-2"
    >
      <h2
        id={`category-title-${categoryId}`}
        className="text-base font-semibold text-gray-900 mb-3"
      >
        {categoryName}
      </h2>
      <div className="divide-y divide-gray-100">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={onAddProduct}
          />
        ))}
      </div>
    </section>
  );
}
