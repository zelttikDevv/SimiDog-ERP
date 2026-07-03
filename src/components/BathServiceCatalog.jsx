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
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

export default function BathServiceCatalog() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [size, setSize] = useState("pequeno");
  const [serviceType, setServiceType] = useState("bano");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const SIZES = [
    { id: "pequeno", label: "Pequeño (<10kg)" },
    { id: "mediano", label: "Mediano (10-25kg)" },
    { id: "grande", label: "Grande (25-40kg)" },
    { id: "gigante", label: "Gigante (>40kg)" }
  ];

  const SERVICE_TYPES = [
    { id: "bano", label: "Solo Baño" },
    { id: "corte", label: "Solo Corte" },
    { id: "bano_y_corte", label: "Baño + Corte" }
  ];

  useEffect(() => {
    const q = query(
      collection(db, "bath_services"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      setServices(data);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  const handleCreate = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setDefaultPrice("");
    setDuration("60");
    setSize("pequeno");
    setServiceType("bano");
    setActive(true);
    setShowForm(true);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || "");
    setDefaultPrice(service.defaultPrice || "");
    setDuration(service.duration || "60");
    setSize(service.size || "pequeno");
    setServiceType(service.serviceType || "bano");
    setActive(service.active !== false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !defaultPrice) {
      alert("Completa nombre y precio");
      return;
    }

    setSaving(true);

    try {
      const serviceData = {
        name: name.trim(),
        description: description.trim(),
        defaultPrice: parseFloat(defaultPrice),
        duration: parseInt(duration),
        size,
        serviceType,
        active,
        branchId,
        updatedAt: serverTimestamp()
      };

      if (editingService) {
        await updateDoc(doc(db, "bath_services", editingService.id), serviceData);
      } else {
        serviceData.createdAt = serverTimestamp();
        await addDoc(collection(db, "bath_services"), serviceData);
      }

      setShowForm(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm("¿Desactivar este servicio?")) return;
    try {
      await updateDoc(doc(db, "bath_services", serviceId), { active: false });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Catálogo de Servicios de Baño</h2>
          <p className="text-sm text-gray-500">Gestiona los servicios de baño y corte</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          ➕ Nuevo Servicio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay servicios de baño registrados
          </div>
        ) : (
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {SERVICE_TYPES.find((t) => t.id === service.serviceType)?.label || service.serviceType}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {SIZES.find((s) => s.id === service.size)?.label || service.size}
                    </span>
                  </div>
                  {service.description && (
                    <div className="text-sm text-gray-500 mt-1">{service.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    ⏱️ {service.duration} min · 💰 ${service.defaultPrice}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {editingService ? "Editar Servicio" : "Nuevo Servicio de Baño"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Ej: Baño Perro Pequeño"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm">Servicio activo</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}