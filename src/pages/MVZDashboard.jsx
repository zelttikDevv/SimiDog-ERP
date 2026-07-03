import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import VetServices from "../components/VetServices";
import MedicalHistory from "../components/MedicalHistory";

export default function MVZDashboard() {
  const [activeTab, setActiveTab] = useState("services");
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menuItems = [
    { id: "services", label: "Mis Servicios", icon: "🏥" },
    { id: "history", label: "Historia Clínica", icon: "📋" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🐾</div>
              <div>
                <h1 className="text-xl font-bold text-indigo-600">SimiDog MVZ</h1>
                <p className="text-xs text-gray-500">Panel Veterinario</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">{currentUser?.email}</div>
                <div className="text-xs text-gray-500">Médico Veterinario</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <nav className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === item.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "services" && <VetServices />}
        {activeTab === "history" && <MedicalHistory />}
      </main>
    </div>
  );
                    }
