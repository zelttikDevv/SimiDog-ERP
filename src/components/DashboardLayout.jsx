import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  PawPrint,
  Menu,
  X,
  LogOut
} from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function DashboardLayout({ children, role, menuItems, activeTab, setActiveTab }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const roleLabels = {
    admin: "Administrador",
    recepcionista: "Recepcionista",
    mvz: "Médico Veterinario"
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar desktop/tablet */}
      <Sidebar
        menuItems={menuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        userEmail={currentUser?.email}
        onLogout={handleLogout}
      />

      {/* Header móvil */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-tight">SimiDog</h1>
            <p className="text-[10px] text-slate-500 leading-tight">{roleLabels[role]}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Drawer móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                  <PawPrint className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-slate-900">SimiDog</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-5 h-5">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="text-xs text-slate-500 mb-2 truncate">{currentUser?.email}</div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="lg:ml-64 md:ml-16 pb-20 lg:pb-6">
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom nav móvil */}
      <BottomNav
        menuItems={menuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMore={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}