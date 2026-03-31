interface KeyValueEntry {
  label: string;
  value: React.ReactNode;
}

interface AdminKeyValueListProps {
  items: KeyValueEntry[];
}

export default function AdminKeyValueList({ items }: AdminKeyValueListProps) {
  return (
    <dl className="divide-y divide-gray-100">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col sm:flex-row gap-1 sm:gap-0 py-2.5">
          <dt className="w-full sm:w-40 shrink-0 text-sm font-medium text-gray-500">{item.label}</dt>
          <dd className="text-sm text-gray-900 break-all">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
