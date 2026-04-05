interface Props {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md";
}

export default function StarRating({ rating, maxRating = 5, size = "md" }: Props) {
  const starSize = size === "sm" ? "text-sm" : "text-lg";
  return (
    <div className={`flex gap-0.5 ${starSize}`} aria-label={`${rating} out of ${maxRating} stars`}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-200"}>★</span>
      ))}
    </div>
  );
}
