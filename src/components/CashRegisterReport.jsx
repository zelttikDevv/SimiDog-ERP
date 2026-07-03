import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  where
} from "firebase/firestore";

const BRANCHES = {
  "sucursal-11av": "SimiDog 11av",
  "sucursal-65av": "SimiDog 65av"
};

export default function CashRegisterReport() {
  const [registers, setRegisters] = useState([]);
  const [openRegisters, setOpenRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("all");

  useEffect(() => {
    // Cajas abiertas
    const qOpen = query(
      collection(db, "cash_registers"),
      where("status", "==", "abierta")
    );
    const unsubscribeOpen = onSnapshot(qOpen, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOpenRegisters(data);
    }, (error) => {
      console.error("Error en cajas abiertas:", error);
    });

    // Cajas cerradas (SIN orderBy, ordenamos en cliente)
    const qClosed = query(
      collection(db, "cash_registers"),
      where("status", "==", "cerrada")
    );
    const unsubscribeClosed = onSnapshot(qClosed, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.closedAt?.toMillis?.() || 0;
          const bTime = b.closedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setRegisters(data);
      setLoading(false);
    }, (error) => {
      console.error("Error en historial:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeOpen();
      unsubscribeClosed();
    };
  }, []);

  const filteredRegisters = filterBranch === "all"
    ? registers
    : registers.filter((r) => r.branchId === filterBranch);

  const filteredOpen = filterBranch === "all"
    ? openRegisters
    : openRegisters.filter((r) => r.branchId === filterBranch);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cajas abiertas en tiempo real */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">🟢 Cajas Abiertas (Tiempo Real)</h3>
        
        {filteredOpen.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No hay cajas abiertas
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredOpen.map((reg) => (
              <div key={reg.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-green-800">
                    {BRANCHES[reg.branchId] || reg.branchId}
                  </span>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Abierta</span>
                </div>
                <div className="text-xs text-green-700 space-y-1">
                  <div>Abierta por: {reg.openedByEmail}</div>
                  {reg.openedAt?.toDate && (
                    <div>Apertura: {reg.openedAt.toDate().toLocaleString("es-ES")}</div>
                  )}
                  <div>Fondo inicial: ${reg.initialAmount.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterBranch("all")}
          className={`px-3 py-1.5 rounded-md text-sm ${filterBranch === "all" ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"}`}
        >
          Todas las sucursales
        </button>
        {Object.entries(BRANCHES).map(([id, name]) => (
          <button
            key={id}
            onClick={() => setFilterBranch(id)}
            className={`px-3 py-1.5 rounded-md text-sm ${filterBranch === id ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"}`}
          >
            {name.replace("SimiDog ", "")}
          </button>
        ))}
      </div>

      {/* Historial de cortes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">📜 Historial de Cortes</h3>
        </div>
        
        {filteredRegisters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No hay cortes registrados
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {filteredRegisters.map((reg) => {
              const diffColor = (reg.difference || 0) >= 0 ? "text-green-600" : "text-red-600";
              const totalExpected = (reg.expectedCash || 0) + (reg.expectedCard || 0) + (reg.expectedTransfer || 0);
              const totalActual = (reg.actualCash || 0) + (reg.actualCard || 0) + (reg.actualTransfer || 0);
              
              return (
                <div key={reg.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{BRANCHES[reg.branchId] || reg.branchId}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Cerrada</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {reg.closedAt?.toDate && (
                          <>Cierre: {reg.closedAt.toDate().toLocaleString("es-ES")}</>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {reg.openedByEmail} → {reg.closedByEmail}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${diffColor}`}>
                      {(reg.difference || 0) >= 0 ? "✓" : "⚠"} ${Math.abs(reg.difference || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                    <div>
                      <div className="text-gray-500">Total Esperado:</div>
                      <div className="font-semibold">${totalExpected.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Real:</div>
                      <div className="font-semibold">${totalActual.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {reg.notes && (
                    <div className="text-xs text-gray-600 mt-2 italic bg-gray-50 p-2 rounded">
                      📝 {reg.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
      }
