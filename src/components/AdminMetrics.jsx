import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const BRANCHES = {
  "sucursal-11av": "SimiDog 11av",
  "sucursal-65av": "SimiDog 65av"
};

const SERVICE_LABELS = {
  bano: "Baño",
  corte: "Corte",
  bano_y_corte: "Baño + Corte"
};

const PAYMENT_LABELS = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia"
};

export default function AdminMetrics() {
  const [filter, setFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todos los servicios completados
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.status === "completado");
      setServices(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Calcular rango de fechas según filtro
  const getDateRange = () => {
    const now = new Date();
    let start, end;

    if (filter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (filter === "week") {
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59);
    } else if (filter === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59);
    } else {
      // histórico
      return { start: null, end: null };
    }

    return { start, end };
  };

  // Filtrar servicios
  const filteredServices = services.filter((s) => {
    // Filtro por sucursal
    if (branchFilter !== "all" && s.branchId !== branchFilter) return false;

    // Filtro por fecha
    const { start, end } = getDateRange();
    if (!start || !end) return true; // histórico

    if (!s.endTime) return false;
    const serviceDate = s.endTime.toDate ? s.endTime.toDate() : new Date(s.endTime);
    return serviceDate >= start && serviceDate <= end;
  });

  // Calcular métricas
  const totalServices = filteredServices.length;
  const totalRevenue = filteredServices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const homeServices = filteredServices.filter((s) => s.modality === "domicilio").length;
  const inStoreServices = filteredServices.filter((s) => s.modality === "sucursal").length;

  // Por método de pago
  const byPayment = {};
  filteredServices.forEach((s) => {
    const method = s.paymentMethod || "sin_registro";
    if (!byPayment[method]) {
      byPayment[method] = { count: 0, total: 0 };
    }
    byPayment[method].count++;
    byPayment[method].total += s.totalCost || 0;
  });

  // Por tipo de servicio
  const byServiceType = {};
  filteredServices.forEach((s) => {
    const type = s.serviceType || "sin_registro";
    if (!byServiceType[type]) {
      byServiceType[type] = { count: 0, total: 0 };
    }
    byServiceType[type].count++;
    byServiceType[type].total += s.totalCost || 0;
  });

  // Por sucursal
  const byBranch = {};
  filteredServices.forEach((s) => {
    const branch = s.branchId || "sin_sucursal";
    if (!byBranch[branch]) {
      byBranch[branch] = { count: 0, total: 0 };
    }
    byBranch[branch].count++;
    byBranch[branch].total += s.totalCost || 0;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => setFilter("today")}
            className={`py-2 px-3 rounded-md text-sm ${filter === "today" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilter("week")}
            className={`py-2 px-3 rounded-md text-sm ${filter === "week" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Esta semana
          </button>
          <button
            onClick={() => setFilter("custom")}
            className={`py-2 px-3 rounded-md text-sm ${filter === "custom" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Rango personalizado
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`py-2 px-3 rounded-md text-sm ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Histórico
          </button>
        </div>

        {filter === "custom" && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-1">Sucursal</label>
          <div className="flex gap-2">
            <button
              onClick={() => setBranchFilter("all")}
              className={`py-1.5 px-3 rounded-md text-sm ${branchFilter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Todas
            </button>
            {Object.entries(BRANCHES).map(([id, name]) => (
              <button
                key={id}
                onClick={() => setBranchFilter(id)}
                className={`py-1.5 px-3 rounded-md text-sm ${branchFilter === id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {name.replace("SimiDog ", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Servicios</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{totalServices}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Ingresos</div>
          <div className="text-3xl font-bold text-green-600 mt-1">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">En Sucursal</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{inStoreServices}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">A Domicilio</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{homeServices}</div>
        </div>
      </div>

      {/* Por sucursal */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Por Sucursal</h3>
        <div className="space-y-2">
          {Object.entries(byBranch).map(([branchId, data]) => (
            <div key={branchId} className="flex justify-between items-center border-b pb-2">
              <span className="text-sm">{BRANCHES[branchId] || branchId}</span>
              <div className="text-right">
                <div className="text-sm font-semibold">{data.count} servicios</div>
                <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {Object.keys(byBranch).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Sin datos</div>
          )}
        </div>
      </div>

      {/* Por tipo de servicio */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">✂️ Por Tipo de Servicio</h3>
        <div className="space-y-2">
          {Object.entries(byServiceType).map(([type, data]) => (
            <div key={type} className="flex justify-between items-center border-b pb-2">
              <span className="text-sm">{SERVICE_LABELS[type] || type}</span>
              <div className="text-right">
                <div className="text-sm font-semibold">{data.count}</div>
                <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {Object.keys(byServiceType).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Sin datos</div>
          )}
        </div>
      </div>

      {/* Por método de pago */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">💳 Por Método de Pago</h3>
        <div className="space-y-2">
          {Object.entries(byPayment).map(([method, data]) => (
            <div key={method} className="flex justify-between items-center border-b pb-2">
              <span className="text-sm">{PAYMENT_LABELS[method] || method}</span>
              <div className="text-right">
                <div className="text-sm font-semibold">{data.count}</div>
                <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {Object.keys(byPayment).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
}
