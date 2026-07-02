import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

const STATUS_OPTIONS = [
  { id: "esperando_turno", label: "⏳ Esperando turno", color: "bg-yellow-100 text-yellow-800" },
  { id: "en_proceso", label: "🔧 En proceso", color: "bg-blue-100 text-blue-800" },
  { id: "finalizado_esperando_dueño", label: "✅ Finalizado - Esperando dueño", color: "bg-green-100 text-green-800" },
  { id: "esperando_despacho", label: "🚗 Esperando despacho a domicilio", color: "bg-purple-100 text-purple-800" }
];

const SERVICE_LABELS = {
  bano: "Baño",
  corte: "Corte",
  bano_y_corte: "Baño + Corte"
};

function getTimeElapsed(arrivalTime) {
  if (!arrivalTime) return "--:--";
  const arrival = arrivalTime.toDate ? arrivalTime.toDate() : new Date(arrivalTime);
  const now = new Date();
  const diffMs = now - arrival;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function ActiveServices() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Cronómetro en vivo
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar servicios activos
  useEffect(() => {
    const q = query(
      collection(db, "services"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.status !== "completado")
        .sort((a, b) => {
          const aTime = a.arrivalTime?.toMillis?.() || 0;
          const bTime = b.arrivalTime?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setServices(data);
      setLoading(false);
    }, (error) => {
      console.error("Error en listener:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  // Cambiar estado
  const handleChangeStatus = async (serviceId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === "en_proceso" && !services.find((s) => s.id === serviceId)?.startTime) {
      updateData.startTime = serverTimestamp();
    }
    await updateDoc(doc(db, "services", serviceId), updateData);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Info importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          💡 <strong>Nota:</strong> El cobro de servicios se realiza desde el <strong>POS (Punto de Venta)</strong>. 
          Esta sección es solo para gestionar el estado de los servicios.
        </p>
      </div>

      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
          No hay servicios activos en esta sucursal
        </div>
      )}

      {services.map((service) => {
        const statusInfo = STATUS_OPTIONS.find((s) => s.id === service.status) || STATUS_OPTIONS[0];

        return (
          <div key={service.id} className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">🐾 {service.petName}</h3>
                <p className="text-sm text-gray-500">👤 {service.ownerName} · 📞 {service.ownerPhone}</p>
                {service.petWeight && (
                  <p className="text-xs text-gray-400">⚖️ {service.petWeight} kg</p>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-xl font-bold text-indigo-600">
                  {getTimeElapsed(service.arrivalTime)}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            <div className="flex gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{SERVICE_LABELS[service.serviceType]}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {service.modality === "domicilio" ? "🚗 Domicilio" : "🏪 Sucursal"}
              </span>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter((s) => s.id !== service.status).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleChangeStatus(service.id, option.id)}
                    className="text-xs px-3 py-2 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
                    }
