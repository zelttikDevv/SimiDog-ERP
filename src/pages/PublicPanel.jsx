import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

const BRANCHES = {
  "11av": { id: "sucursal-11av", name: "SimiDog 11av", color: "from-indigo-600 to-purple-600" },
  "65av": { id: "sucursal-65av", name: "SimiDog 65av", color: "from-pink-600 to-rose-600" }
};

const STATUS_CONFIG = {
  esperando_turno: { label: "Esperando turno", icon: "⏳", bg: "bg-yellow-500" },
  en_proceso: { label: "En proceso", icon: "🔧", bg: "bg-blue-500" },
  finalizado_esperando_dueño: { label: "Listo - Esperando dueño", icon: "✅", bg: "bg-green-500" },
  esperando_despacho: { label: "Listo - Despacho domicilio", icon: "🚗", bg: "bg-purple-500" }
};

const SERVICE_LABELS = {
  bano: "🛁 Baño",
  corte: "✂️ Corte",
  bano_y_corte: "🛁✂️ Baño + Corte"
};

function getTimeElapsed(arrivalTime) {
  if (!arrivalTime) return "--:--:--";
  const arrival = arrivalTime.toDate ? arrivalTime.toDate() : new Date(arrivalTime);
  const now = new Date();
  const diffMs = now - arrival;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function PublicPanel() {
  const { branch } = useParams();
  const branchConfig = BRANCHES[branch];
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setTick] = useState(0);

  // Cronómetro en vivo (actualiza cada segundo)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar servicios en tiempo real
  useEffect(() => {
    if (!branchConfig) return;

    const q = query(
      collection(db, "services"),
      where("branchId", "==", branchConfig.id)
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
    });

    return unsubscribe;
  }, [branch]);

  // Sucursal no válida
  if (!branchConfig) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">❌ Sucursal no válida</h1>
          <p className="text-gray-400">URLs válidas: /panel/11av o /panel/65av</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className={`bg-gradient-to-r ${branchConfig.color} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🐾 {branchConfig.name}</h1>
            <p className="text-sm opacity-90">Panel de estado en tiempo real</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">
              {currentTime.toLocaleTimeString("es-ES")}
            </div>
            <div className="text-sm opacity-90">
              {currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-yellow-400">
            {services.filter((s) => s.status === "esperando_turno").length}
          </div>
          <div className="text-xs text-gray-400">Esperando turno</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {services.filter((s) => s.status === "en_proceso").length}
          </div>
          <div className="text-xs text-gray-400">En proceso</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-green-400">
            {services.filter((s) => s.status === "finalizado_esperando_dueño").length}
          </div>
          <div className="text-xs text-gray-400">Listos</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-3xl font-bold text-purple-400">
            {services.filter((s) => s.status === "esperando_despacho").length}
          </div>
          <div className="text-xs text-gray-400">Despacho</div>
        </div>
      </div>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-6 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🐾</div>
            <h2 className="text-2xl font-bold text-gray-400">No hay mascotas en espera</h2>
            <p className="text-gray-500 mt-2">Las mascotas aparecerán aquí cuando lleguen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const statusInfo = STATUS_CONFIG[service.status] || STATUS_CONFIG.esperando_turno;
              
              return (
                <div
                  key={service.id}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700"
                >
                  {/* Status bar */}
                  <div className={`${statusInfo.bg} px-4 py-2 flex justify-between items-center`}>
                    <span className="font-semibold text-sm">
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                    <span className="text-xs opacity-90">
                      {service.modality === "domicilio" ? "🚗 Domicilio" : "🏪 Sucursal"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Mascota */}
                    <div>
                      <h3 className="text-2xl font-bold">🐾 {service.petName}</h3>
                      <p className="text-sm text-gray-400">👤 {service.ownerName}</p>
                    </div>

                    {/* Servicio */}
                    <div className="text-sm text-gray-300">
                      {SERVICE_LABELS[service.serviceType]}
                    </div>

                    {/* Cronómetro */}
                    <div className="bg-gray-900 rounded-md p-3 text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Tiempo en sucursal</div>
                      <div className="text-3xl font-mono font-bold text-white mt-1">
                        {getTimeElapsed(service.arrivalTime)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
            }
