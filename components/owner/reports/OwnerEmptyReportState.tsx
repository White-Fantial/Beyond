interface Props {
  message?: string;
}

export default function OwnerEmptyReportState({ message = "No data available for the selected period." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📊</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
