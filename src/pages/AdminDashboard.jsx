import { useState } from "react";
import {
  BarChart3,
  Users,
  Package,
  Stethoscope,
  Scissors,
  TrendingDown,
  Ticket,
  Wallet
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import AdminMetrics from "../components/AdminMetrics";
import AdminUsers from "../components/AdminUsers";
import Inventory from "../components/Inventory";
import Consumptions from "../components/Consumptions";
import CouponManager from "../components/CouponManager";
import CashRegisterReport from "../components/CashRegisterReport";
import MedicalServiceCatalog from "../components/MedicalServiceCatalog";
import BathServiceCatalog from "../components/BathServiceCatalog";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("metrics");

  const menuItems = [
    { id: "metrics", label: "Métricas", icon: <BarChart3 className="w-5 h-5" /> },
    { id: "users", label: "Usuarios", icon: <Users className="w-5 h-5" /> },
    { id: "inventory", label: "Inventario", icon: <Package className="w-5 h-5" /> },
    { id: "medical", label: "Serv. Médicos", icon: <Stethoscope className="w-5 h-5" /> },
    { id: "bath", label: "Serv. Baño", icon: <Scissors className="w-5 h-5" /> },
    { id: "consumptions", label: "Consumos", icon: <TrendingDown className="w-5 h-5" /> },
    { id: "coupons", label: "Cupones", icon: <Ticket className="w-5 h-5" /> },
    { id: "cash", label: "Cajas", icon: <Wallet className="w-5 h-5" /> }
  ];

  return (
    <DashboardLayout
      role="admin"
      menuItems={menuItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeTab === "metrics" && <AdminMetrics />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "inventory" && <Inventory />}
      {activeTab === "medical" && <MedicalServiceCatalog />}
      {activeTab === "bath" && <BathServiceCatalog />}
      {activeTab === "consumptions" && <Consumptions showReport={true} />}
      {activeTab === "coupons" && <CouponManager />}
      {activeTab === "cash" && <CashRegisterReport />}
    </DashboardLayout>
  );
}