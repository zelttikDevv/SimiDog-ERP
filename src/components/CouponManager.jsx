import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all"); // all, available, used

  // Formulario
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Cargar cupones
  useEffect(() => {
    const loadCoupons = async () => {
      const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCoupons(data);
      setLoading(false);
    };
    loadCoupons();
  }, []);

  // Cargar dueños
  useEffect(() => {
    const loadOwners = async () => {
      const snapshot = await getDocs(collection(db, "owners"));
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setOwners(data);
    };
    loadOwners();
  }, []);

  // Generar código aleatorio
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "SD-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  // Crear cupón
  const handleCreate = async () => {
    if (!code.trim()) {
      setMessage("❌ Genera o ingresa un código");
      return;
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      setMessage("❌ Ingresa un valor de descuento válido");
      return;
    }
    if (!selectedOwnerId) {
      setMessage("❌ Selecciona un cliente");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const owner = owners.find((o) => o.id === selectedOwnerId);
      
      await addDoc(collection(db, "coupons"), {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        ownerId: selectedOwnerId,
        ownerName: owner?.name || "Desconocido",
        ownerPhone: owner?.phone || "",
        used: false,
        usedAt: null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: serverTimestamp(),
        createdBy: "admin"
      });

      setMessage(`✅ Cupón ${code} creado para ${owner?.name}`);
      setShowForm(false);
      setCode("");
      setDiscountValue("");
      setSelectedOwnerId("");
      setExpiresAt("");
      
      // Recargar cupones
      const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setCoupons(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error creando cupón:", error);
      setMessage("❌ Error al crear el cupón");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cupón
  const handleDelete = async (couponId) => {
    if (!confirm("¿Eliminar este cupón?")) return;
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      setCoupons(coupons.filter((c) => c.id !== couponId));
    } catch (error) {
      console.error("Error eliminando:", error);
    }
  };

  // Filtrar cupones
  const filteredCoupons = coupons.filter((c) => {
    if (filter === "available") return !c.used;
    if (filter === "used") return c.used;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando cupones...</div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* Botón crear */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700"
        >
          🎟️ Crear nuevo cupón
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">Nuevo Cupón</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                placeholder="SD-ABC123"
              />
              <button
                onClick={generateCode}
                className="bg-gray-200 px-3 py-2 rounded-md text-sm hover:bg-gray-300"
              >
                🎲 Generar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="percent">Porcentaje (%)</option>
                <option value="amount">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder={discountType === "percent" ? "10" : "50.00"}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecciona un cliente...</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.phone ? `· ${o.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de expiración (opcional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Creando..." : "✅ Crear cupón"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "Todos" },
          { id: "available", label: "Disponibles" },
          { id: "used", label: "Usados" }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filter === f.id ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de cupones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredCoupons.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No hay cupones</div>
        ) : (
          <div className="divide-y">
            {filteredCoupons.map((coupon) => {
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : coupon.expiresAt) < new Date();
              
              return (
                <div key={coupon.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{coupon.code}</span>
                        {coupon.used && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Usado</span>
                        )}
                        {isExpired && !coupon.used && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Expirado</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {coupon.discountType === "percent" 
                          ? `${coupon.discountValue}% de descuento`
                          : `$${coupon.discountValue.toFixed(2)} de descuento`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        👤 {coupon.ownerName}
                        {coupon.expiresAt && (
                          <span> · 📅 Vence: {new Date(coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : coupon.expiresAt).toLocaleDateString("es-ES")}</span>
                        )}
                      </div>
                      {coupon.used && coupon.usedAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Usado: {new Date(coupon.usedAt.toDate ? coupon.usedAt.toDate() : coupon.usedAt).toLocaleString("es-ES")}
                        </div>
                      )}
                    </div>
                    {!coupon.used && (
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                      >
                        🗑️
                      </button>
                    )}
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
