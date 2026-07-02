import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import AdminMetrics from "../components/AdminMetrics";
import AdminUsers from "../components/AdminUsers";
import Inventory from "../components/Inventory";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("metrics");
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">🐾 SimiDog Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{currentUser?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "metrics"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 Métricas
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            👥 Usuarios
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "inventory"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📦 Inventario
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "metrics" && <AdminMetrics />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "inventory" && <Inventory />}
      </main>
    </div>
  );
}
