import { MoreHorizontal } from "lucide-react";

export default function BottomNav({ menuItems, activeTab, setActiveTab, onOpenMore }) {
  const visibleItems = menuItems.slice(0, 4);
  const moreItems = menuItems.slice(4);
  const activeInMore = moreItems.some((item) => item.id === activeTab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-bottom">
      <div className="flex justify-around items-center h-16">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === item.id
                ? "text-blue-600"
                : "text-slate-500"
            }`}
          >
            <span className="w-5 h-5 mb-0.5">{item.icon}</span>
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        ))}
        
        {moreItems.length > 0 && (
          <button
            onClick={() => onOpenMore && onOpenMore()}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeInMore ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight">Más</span>
          </button>
        )}
      </div>
    </nav>
  );
}