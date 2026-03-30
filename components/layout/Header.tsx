export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">매장</div>
          <select className="text-sm font-medium text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option>강남 1호점</option>
            <option>홍대 2호점</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-gray-700 text-sm">
            🔔 알림
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-sm font-medium">
              A
            </div>
            <span className="text-sm font-medium text-gray-700">관리자</span>
          </div>
        </div>
      </div>
    </header>
  );
}
