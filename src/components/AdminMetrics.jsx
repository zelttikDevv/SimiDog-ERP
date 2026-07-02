import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";

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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todas las transacciones completadas
  useEffect(() => {
    const q = query(collection(db, "transactions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((t) => t.status === "completado");
      setTransactions(data);
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

  // Filtrar transacciones
  const filteredTransactions = transactions.filter((t) => {
    // Filtro por sucursal
    if (branchFilter !== "all" && t.branchId !== branchFilter) return false;

    // Filtro por fecha
    const { start, end } = getDateRange();
    if (!start || !end) return true; // histórico

    if (!t.timestamp) return false;
    const txDate = t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
    return txDate >= start && txDate <= end;
  });

  // Calcular métricas
  const totalTransactions = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
  
  // Calcular ingresos por tipo de item
  let servicesRevenue = 0;
  let productsRevenue = 0;
  
  filteredTransactions.forEach((t) => {
    t.items?.forEach((item) => {
      if (item.type === "product") {
        productsRevenue += item.total || 0;
      } else {
        // bath, mvz, o service
        servicesRevenue += item.total || 0;
      }
    });
  });

  // Por método de pago
  const byPayment = {};
  filteredTransactions.forEach((t) => {
    t.payments?.forEach((p) => {
      const method = p.method || "sin_registro";
      if (!byPayment[method]) {
        byPayment[method] = { count: 0, total: 0 };
      }
      byPayment[method].count++;
      byPayment[method].total += p.amount || 0;
    });
  });

  // Por tipo de servicio/producto
  const byItemType = {};
  filteredTransactions.forEach((t) => {
    t.items?.forEach((item) => {
      const type = item.type || "unknown";
      if (!byItemType[type]) {
        byItemType[type] = { count: 0, total: 0, name: item.name };
      }
      byItemType[type].count++;
      byItemType[type].total += item.total || 0;
    });
  });

  // Por sucursal
  const byBranch = {};
  filteredTransactions.forEach((t) => {
    const branch = t.branchId || "sin_sucursal";
    if (!byBranch[branch]) {
      byBranch[branch] = { count: 0, total: 0 };
    }
    byBranch[branch].count++;
    byBranch[branch].total += t.total || 0;
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
          <div className="text-xs text-gray-500 uppercase">Ventas</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{totalTransactions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Ingresos Totales</div>
          <div className="text-3xl font-bold text-green-600 mt-1">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Servicios</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">${servicesRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Productos</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">${productsRevenue.toFixed(2)}</div>
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
                <div className="text-sm font-semibold">{data.count} ventas</div>
                <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {Object.keys(byBranch).length === 0 && (
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
                <div className="text-sm font-semibold">{data.count} transacciones</div>
                <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {Object.keys(byPayment).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Sin datos</div>
          )}
        </div>
      </div>

      {/* Detalle por tipo de item */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Detalle por Tipo</h3>
        <div className="space-y-2">
          {Object.entries(byItemType).map(([type, data]) => {
            const typeName = type === "product" ? "🛍️ Producto" : type === "bath" ? "🛁 Baño/Corte" : type === "mvz" ? "🏥 Servicio MVZ" : type;
            return (
              <div key={type} className="flex justify-between items-center border-b pb-2">
                <span className="text-sm">{typeName}</span>
                <div className="text-right">
                  <div className="text-sm font-semibold">{data.count} vendidos</div>
                  <div className="text-xs text-gray-500">${data.total.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
          {Object.keys(byItemType).length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
        }
