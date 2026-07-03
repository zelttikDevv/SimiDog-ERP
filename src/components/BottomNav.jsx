import { MoreHorizontal } from "lucide-react";

export default function BottomNav({ menuItems, activeTab, setActiveTab }) {
  // Mostrar solo los primeros 4 items, el resto va en "Más"
  const visibleItems = menuItems.slice(0, 4);
  const moreItems = menuItems.slice(4);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
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
            <span className="w-5 h-5 mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
        
        {moreItems.length > 0 && (
          <button
            onClick={() => {
              // Abrir drawer con más opciones
              const event = new CustomEvent("openMobileMenu");
              window.dispatchEvent(event);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              moreItems.some((item) => item.id === activeTab)
                ? "text-blue-600"
                : "text-slate-500"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Más</span>
          </button>
        )}
      </div>
    </nav>
  );
}