import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
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

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "tarjeta", label: "Tarjeta" },
  { id: "transferencia", label: "Transferencia" }
];

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
  const [checkoutId, setCheckoutId] = useState(null);
  const [cost, setCost] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // Cronómetro en vivo
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar servicios activos (solo de la sucursal del usuario)
  useEffect(() => {
    const q = query(
      collection(db, "services"),
      where("branchId", "==", branchId),
      orderBy("arrivalTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.status !== "completado");
      setServices(data);
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

  // Dar salida
  const handleCheckout = async (serviceId) => {
    if (!cost || parseFloat(cost) <= 0) {
      alert("Ingresa un costo válido");
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, "services", serviceId), {
      status: "completado",
      endTime: serverTimestamp(),
      totalCost: parseFloat(cost),
      paymentMethod
    });
    setCheckoutId(null);
    setCost("");
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-4">
      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
          No hay servicios activos en esta sucursal
        </div>
      )}

      {/* Lista de servicios */}
      {services.map((service) => {
        const statusInfo = STATUS_OPTIONS.find((s) => s.id === service.status) || STATUS_OPTIONS[0];

        return (
          <div key={service.id} className="bg-white rounded-lg shadow p-4 space-y-3">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">🐾 {service.petName}</h3>
                <p className="text-sm text-gray-500">👤 {service.ownerName} · 📞 {service.ownerPhone}</p>
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

            {/* Info */}
            <div className="flex gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{SERVICE_LABELS[service.serviceType]}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {service.modality === "domicilio" ? "🚗 Domicilio" : "🏪 Sucursal"}
              </span>
            </div>

            {/* Acciones de estado */}
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.filter((s) => s.id !== service.status).map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleChangeStatus(service.id, option.id)}
                  className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Botón de salida */}
            {checkoutId !== service.id ? (
              <button
                onClick={() => setCheckoutId(service.id)}
                className="w-full bg-red-500 text-white py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Dar Salida y Cobrar
              </button>
            ) : (
              <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                <h4 className="text-sm font-semibold">Registrar Cobro</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Costo ($)"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="flex-1 border rounded-md px-3 py-2 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCheckout(service.id)}
                    disabled={saving}
                    className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "✅ Confirmar Salida"}
                  </button>
                  <button
                    onClick={() => setCheckoutId(null)}
                    className="px-4 py-2 border rounded-md text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
        }
