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
  serverTimestamp,
  orderBy
} from "firebase/firestore";

const SUGGESTIONS = [
  "Baño de ",
  "Consulta MVZ ",
  "Limpieza de área",
  "Uso general",
  "Mantenimiento"
];

export default function Consumptions({ showReport = false }) {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [supplies, setSupplies] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyFilter, setHistoryFilter] = useState("today");

  // Cargar insumos
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => p.active !== false && p.type === "insumo")
        .sort((a, b) => a.name.localeCompare(b.name));
      setSupplies(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  // Cargar historial de consumos
  useEffect(() => {
    const q = query(
      collection(db, "internal_consumptions"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0;
          const bTime = b.timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setConsumptions(data);
    });

    return unsubscribe;
  }, [branchId]);

  // Filtrar historial por fecha
  const getFilteredHistory = () => {
    const now = new Date();
    let start;

    if (historyFilter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (historyFilter === "week") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (historyFilter === "month") {
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
    } else {
      return consumptions;
    }

    return consumptions.filter((c) => {
      const cDate = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
      return cDate >= start;
    });
  };

  // KPIs de gastos
  const calculateKPIs = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    let today = 0, week = 0, month = 0;

    consumptions.forEach((c) => {
      const cDate = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
      const cost = c.totalCost || 0;

      if (cDate >= todayStart) today += cost;
      if (cDate >= weekStart) week += cost;
      if (cDate >= monthStart) month += cost;
    });

    return { today, week, month };
  };

  // Seleccionar insumo
  const handleSelectSupply = (supply) => {
    setSelectedSupply(supply);
    setQuantity("");
    setReason("");
    setNotes("");
    setShowForm(true);
    setMessage("");
  };

  // Aplicar sugerencia
  const applySuggestion = (suggestion) => {
    setReason(suggestion);
  };

  // Registrar consumo
  const handleRegister = async () => {
    if (!selectedSupply) {
      setMessage("❌ Selecciona un insumo");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setMessage("❌ Ingresa una cantidad válida");
      return;
    }
    if (!reason.trim()) {
      setMessage("❌ Ingresa el motivo del consumo");
      return;
    }

    const qty = parseFloat(quantity);

    if (qty > selectedSupply.stock) {
      setMessage(`❌ Stock insuficiente. Disponible: ${selectedSupply.stock} ${selectedSupply.unit}`);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const unitCost = selectedSupply.cost || 0;
      const totalCost = qty * unitCost;

      // Registrar consumo
      await addDoc(collection(db, "internal_consumptions"), {
        productId: selectedSupply.id,
        productName: selectedSupply.name,
        category: selectedSupply.category,
        subcategory: selectedSupply.subcategory,
        quantity: qty,
        unit: selectedSupply.unit,
        unitCost,
        totalCost,
        reason: reason.trim(),
        notes: notes.trim(),
        userId: currentUser?.uid,
        userName: userData?.email || "Desconocido",
        branchId,
        timestamp: serverTimestamp()
      });

      // Descontar stock
      await updateDoc(doc(db, "products", selectedSupply.id), {
        stock: selectedSupply.stock - qty,
        updatedAt: serverTimestamp()
      });

      setMessage(`✅ Consumo registrado. Stock actual: ${selectedSupply.stock - qty} ${selectedSupply.unit}`);
      setShowForm(false);
      setSelectedSupply(null);
      setQuantity("");
      setReason("");
      setNotes("");
    } catch (error) {
      console.error("Error registrando consumo:", error);
      setMessage("❌ Error al registrar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const filteredSupplies = supplies.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = getFilteredHistory();
  const kpis = showReport ? calculateKPIs() : null;

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs de gastos (solo admin) */}
      {showReport && kpis && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500 uppercase">Hoy</div>
            <div className="text-2xl font-bold text-red-600 mt-1">${kpis.today.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500 uppercase">Esta semana</div>
            <div className="text-2xl font-bold text-red-600 mt-1">${kpis.week.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs text-gray-500 uppercase">Este mes</div>
            <div className="text-2xl font-bold text-red-600 mt-1">${kpis.month.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Mensaje */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* Botón nuevo consumo */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700"
        >
          ➕ Registrar consumo de insumo
        </button>
      )}

      {/* Formulario */}
      {showForm && !selectedSupply && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">Selecciona un insumo</h3>
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredSupplies.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No hay insumos disponibles
              </div>
            ) : (
              filteredSupplies.map((supply) => (
                <button
                  key={supply.id}
                  onClick={() => handleSelectSupply(supply)}
                  className="w-full text-left border rounded-md p-3 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{supply.name}</div>
                      <div className="text-xs text-gray-500">
                        {supply.subcategory} · Costo: ${supply.cost || 0}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${supply.stock <= supply.minStock ? "text-red-600" : "text-gray-700"}`}>
                        {supply.stock} {supply.unit}
                      </div>
                      {supply.stock === 0 && (
                        <div className="text-xs text-red-500">Sin stock</div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="w-full border rounded-md py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Formulario de consumo */}
      {showForm && selectedSupply && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
            <div className="font-medium">{selectedSupply.name}</div>
            <div className="text-xs text-gray-600">
              Stock actual: <strong>{selectedSupply.stock} {selectedSupply.unit}</strong> · 
              Costo unitario: ${selectedSupply.cost || 0}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad ({selectedSupply.unit}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={selectedSupply.stock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Ej: 0.5"
            />
            {quantity && parseFloat(quantity) > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Costo total: ${(parseFloat(quantity) * (selectedSupply.cost || 0)).toFixed(2)}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Ej: Baño de Firulais"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRegister}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Registrando..." : "✅ Registrar consumo"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedSupply(null);
              }}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-semibold">📜 Historial de consumos</h3>
          <div className="flex gap-1">
            {[
              { id: "today", label: "Hoy" },
              { id: "week", label: "Semana" },
              { id: "month", label: "Mes" },
              { id: "all", label: "Todo" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setHistoryFilter(f.id)}
                className={`px-2 py-1 rounded text-xs ${
                  historyFilter === f.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No hay consumos registrados
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {filteredHistory.map((c) => {
              const date = c.timestamp?.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
              return (
                <div key={c.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{c.productName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {c.quantity} {c.unit} · {c.reason}
                      </div>
                      {c.notes && (
                        <div className="text-xs text-gray-400 mt-0.5 italic">
                          {c.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {date.toLocaleDateString("es-ES")} {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {c.userName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600">
                        -${(c.totalCost || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
    }
