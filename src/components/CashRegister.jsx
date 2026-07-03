import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

export default function CashRegister() {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [currentRegister, setCurrentRegister] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showOpenForm, setShowOpenForm] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  const [opening, setOpening] = useState(false);

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [actualCard, setActualCard] = useState("");
  const [actualTransfer, setActualTransfer] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Caja actual abierta
    const qCurrent = query(
      collection(db, "cash_registers"),
      where("branchId", "==", branchId),
      where("status", "==", "abierta")
    );

    const unsubscribeCurrent = onSnapshot(qCurrent, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentRegister({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCurrentRegister(null);
      }
    }, (error) => {
      console.error("Error en caja actual:", error);
    });

    // Historial de cajas cerradas (SIN orderBy, ordenamos en cliente)
    const qHistory = query(
      collection(db, "cash_registers"),
      where("branchId", "==", branchId),
      where("status", "==", "cerrada")
    );

    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
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
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, [branchId]);

  const calculateExpectedTotals = async (registerId) => {
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("branchId", "==", branchId),
      where("cashRegisterId", "==", registerId)
    );

    const snapshot = await getDocs(transactionsQuery);
    let cash = 0, card = 0, transfer = 0;

    snapshot.docs.forEach((doc) => {
      const tx = doc.data();
      tx.payments?.forEach((p) => {
        if (p.method === "efectivo") cash += p.amount || 0;
        if (p.method === "tarjeta") card += p.amount || 0;
        if (p.method === "transferencia") transfer += p.amount || 0;
      });
    });

    return { cash, card, transfer };
  };

  const handleOpenRegister = async () => {
    if (!initialAmount || parseFloat(initialAmount) < 0) {
      alert("Ingresa un monto inicial válido");
      return;
    }

    setOpening(true);

    try {
      await addDoc(collection(db, "cash_registers"), {
        branchId,
        openedBy: currentUser?.uid,
        openedByEmail: userData?.email || "Desconocido",
        openedAt: serverTimestamp(),
        closedBy: null,
        closedAt: null,
        status: "abierta",
        initialAmount: parseFloat(initialAmount),
        expectedCash: 0,
        expectedCard: 0,
        expectedTransfer: 0,
        actualCash: null,
        actualCard: null,
        actualTransfer: null,
        difference: null,
        notes: null
      });

      setShowOpenForm(false);
      setInitialAmount("");
    } catch (error) {
      console.error("Error abriendo caja:", error);
      alert("Error al abrir la caja");
    } finally {
      setOpening(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!currentRegister) return;

    setClosing(true);

    try {
      const expected = await calculateExpectedTotals(currentRegister.id);
      const totalExpected = expected.cash + expected.card + expected.transfer;
      const totalActual = parseFloat(actualCash || 0) + parseFloat(actualCard || 0) + parseFloat(actualTransfer || 0);
      const difference = totalActual - totalExpected;

      await updateDoc(doc(db, "cash_registers", currentRegister.id), {
        closedBy: currentUser?.uid,
        closedByEmail: userData?.email || "Desconocido",
        closedAt: serverTimestamp(),
        status: "cerrada",
        expectedCash: expected.cash,
        expectedCard: expected.card,
        expectedTransfer: expected.transfer,
        actualCash: parseFloat(actualCash || 0),
        actualCard: parseFloat(actualCard || 0),
        actualTransfer: parseFloat(actualTransfer || 0),
        difference,
        notes: closeNotes
      });

      setShowCloseForm(false);
      setActualCash("");
      setActualCard("");
      setActualTransfer("");
      setCloseNotes("");
    } catch (error) {
      console.error("Error cerrando caja:", error);
      alert("Error al cerrar la caja");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando caja...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Caja actual */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">📦 Caja Actual</h3>
        
        {!currentRegister ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No hay caja abierta en esta sucursal</p>
            {!showOpenForm ? (
              <button
                onClick={() => setShowOpenForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
              >
                💰 Abrir Caja
              </button>
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fondo inicial ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Ej: 500.00"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenRegister}
                    disabled={opening}
                    className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {opening ? "Abriendo..." : "Confirmar apertura"}
                  </button>
                  <button
                    onClick={() => setShowOpenForm(false)}
                    className="px-4 py-2 border rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-green-800">✅ Caja Abierta</span>
                <span className="text-xs text-green-600">
                  Abierta por: {currentRegister.openedByEmail}
                </span>
              </div>
              <div className="text-xs text-green-700">
                {currentRegister.openedAt?.toDate && (
                  <>Apertura: {currentRegister.openedAt.toDate().toLocaleString("es-ES")}</>
                )}
              </div>
              <div className="text-sm text-green-800 mt-2">
                Fondo inicial: <strong>${currentRegister.initialAmount.toFixed(2)}</strong>
              </div>
            </div>

            {!showCloseForm ? (
              <button
                onClick={() => setShowCloseForm(true)}
                className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600"
              >
                🔒 Cerrar Caja y Realizar Arqueo
              </button>
            ) : (
              <div className="border-2 border-red-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-red-800">📊 Arqueo de Caja</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      💵 Efectivo real
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      💳 Tarjeta real
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCard}
                      onChange={(e) => setActualCard(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      📱 Transferencia real
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualTransfer}
                      onChange={(e) => setActualTransfer(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    rows="2"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="Faltante, sobrante, incidencias..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCloseRegister}
                    disabled={closing}
                    className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {closing ? "Cerrando..." : "Confirmar cierre"}
                  </button>
                  <button
                    onClick={() => setShowCloseForm(false)}
                    className="px-4 py-2 border rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">📜 Historial de Cortes</h3>
        </div>
        
        {registers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No hay cortes registrados
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {registers.map((reg) => {
              const diffColor = (reg.difference || 0) >= 0 ? "text-green-600" : "text-red-600";
              const diffLabel = (reg.difference || 0) >= 0 ? "Sobrante" : "Faltante";
              
              return (
                <div key={reg.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-semibold">
                        {reg.closedAt?.toDate && (
                          <>Cierre: {reg.closedAt.toDate().toLocaleString("es-ES")}</>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Abierto por: {reg.openedByEmail} · Cerrado por: {reg.closedByEmail}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${diffColor}`}>
                      {diffLabel}: ${Math.abs(reg.difference || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Efectivo</div>
                      <div className="font-semibold">
                        Esp: ${(reg.expectedCash || 0).toFixed(2)} / Real: ${(reg.actualCash || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Tarjeta</div>
                      <div className="font-semibold">
                        Esp: ${(reg.expectedCard || 0).toFixed(2)} / Real: ${(reg.actualCard || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Transferencia</div>
                      <div className="font-semibold">
                        Esp: ${(reg.expectedTransfer || 0).toFixed(2)} / Real: ${(reg.actualTransfer || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {reg.notes && (
                    <div className="text-xs text-gray-600 mt-2 italic">
                      Notas: {reg.notes}
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
