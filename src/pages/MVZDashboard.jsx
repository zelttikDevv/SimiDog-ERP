import { useState } from "react";
import {
  Calendar,
  Stethoscope,
  Clock,
  FileText
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import AppointmentCalendar from "../components/AppointmentCalendar";
import AppointmentDetail from "../components/AppointmentDetail";
import MVZScheduleManager from "../components/MVZScheduleManager";
import MedicalHistory from "../components/MedicalHistory";

export default function MVZDashboard() {
  const [activeTab, setActiveTab] = useState("agenda");

  const menuItems = [
    { id: "agenda", label: "Agenda", icon: <Calendar className="w-5 h-5" /> },
    { id: "atencion", label: "Atención", icon: <Stethoscope className="w-5 h-5" /> },
    { id: "horarios", label: "Horarios", icon: <Clock className="w-5 h-5" /> },
    { id: "historia", label: "Historia", icon: <FileText className="w-5 h-5" /> }
  ];

  return (
    <DashboardLayout
      role="mvz"
      menuItems={menuItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeTab === "agenda" && <AppointmentCalendar />}
      {activeTab === "atencion" && <AppointmentDetail />}
      {activeTab === "horarios" && <MVZScheduleManager />}
      {activeTab === "historia" && <MedicalHistory />}
    </DashboardLayout>
  );
}