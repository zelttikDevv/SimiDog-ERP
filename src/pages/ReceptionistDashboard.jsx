import { useState } from "react";
import {
  ShoppingCart,
  Calendar,
  Wallet,
  PlusCircle,
  ClipboardList,
  Package,
  TrendingDown
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import NewService from "../components/NewService";
import ActiveServices from "../components/ActiveServices";
import Inventory from "../components/Inventory";
import Consumptions from "../components/Consumptions";
import POS from "../components/POS";
import CashRegister from "../components/CashRegister";
import AppointmentCalendar from "../components/AppointmentCalendar";

export default function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState("pos");

  const menuItems = [
    { id: "pos", label: "POS", icon: <ShoppingCart className="w-5 h-5" /> },
    { id: "agenda", label: "Agenda", icon: <Calendar className="w-5 h-5" /> },
    { id: "cash", label: "Caja", icon: <Wallet className="w-5 h-5" /> },
    { id: "new", label: "Nuevo", icon: <PlusCircle className="w-5 h-5" /> },
    { id: "active", label: "Activos", icon: <ClipboardList className="w-5 h-5" /> },
    { id: "inventory", label: "Inventario", icon: <Package className="w-5 h-5" /> },
    { id: "consumptions", label: "Consumos", icon: <TrendingDown className="w-5 h-5" /> }
  ];

  return (
    <DashboardLayout
      role="recepcionista"
      menuItems={menuItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeTab === "pos" && <POS />}
      {activeTab === "agenda" && <AppointmentCalendar />}
      {activeTab === "cash" && <CashRegister />}
      {activeTab === "new" && <NewService />}
      {activeTab === "active" && <ActiveServices />}
      {activeTab === "inventory" && <Inventory />}
      {activeTab === "consumptions" && <Consumptions />}
    </DashboardLayout>
  );
}