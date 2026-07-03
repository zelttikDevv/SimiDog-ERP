import {
  PawPrint,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export default function Sidebar({ menuItems, activeTab, setActiveTab, role, userEmail, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  const roleLabels = {
    admin: "Administrador",
    recepcionista: "Recepcionista",
    mvz: "Médico Veterinario"
  };

  return (
    <>
      {/* Sidebar desktop completo */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SimiDog</h1>
              <p className="text-xs text-slate-400">{roleLabels[role]}</p>
            </div>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Usuario y logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 mb-3 truncate px-3">{userEmail}</div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Sidebar tablet colapsado */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 w-16 bg-slate-900 text-white flex-col z-40">
        {/* Logo */}
        <div className="p-3 border-b border-slate-800 flex justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <PawPrint className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Menú (solo iconos) */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors group relative ${
                activeTab === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
              title={item.label}
            >
              <span className="w-5 h-5">{item.icon}</span>
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-3 rounded-lg text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </>
  );
}