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

export default function MedicalServiceCatalog() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Formulario
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [category, setCategory] = useState("consulta");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const CATEGORIES = [
    { id: "consulta", label: "Consulta" },
    { id: "vacuna", label: "Vacuna" },
    { id: "laboratorio", label: "Laboratorio" },
    { id: "imagen", label: "Imagen (RX/Ultrasonido)" },
    { id: "cirugia", label: "Cirugía" },
    { id: "otro", label: "Otro" }
  ];

  // Cargar servicios
  useEffect(() => {
    const q = query(
      collection(db, "medical_services"),
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

  // Abrir formulario crear
  const handleCreate = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setDefaultPrice("");
    setDuration("30");
    setCategory("consulta");
    setActive(true);
    setShowForm(true);
  };

  // Abrir formulario editar
  const handleEdit = (service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || "");
    setDefaultPrice(service.defaultPrice || "");
    setDuration(service.duration || "30");
    setCategory(service.category || "consulta");
    setActive(service.active !== false);
    setShowForm(true);
  };

  // Guardar servicio
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
        category,
        active,
        branchId,
        updatedAt: serverTimestamp()
      };

      if (editingService) {
        await updateDoc(doc(db, "medical_services", editingService.id), serviceData);
      } else {
        serviceData.createdAt = serverTimestamp();
        await addDoc(collection(db, "medical_services"), serviceData);
      }

      setShowForm(false);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar servicio
  const handleDelete = async (serviceId) => {
    if (!confirm("¿Desactivar este servicio?")) return;

    try {
      await updateDoc(doc(db, "medical_services", serviceId), {
        active: false
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Catálogo de Servicios Médicos</h2>
          <p className="text-sm text-gray-500">Gestiona los procedimientos que puede indicar el MVZ</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
           Nuevo Servicio
        </button>
      </div>

      {/* Lista de servicios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay servicios médicos registrados
          </div>
        ) : (
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {CATEGORIES.find((c) => c.id === service.category)?.label || service.category}
                    </span>
                  </div>
                  {service.description && (
                    <div className="text-sm text-gray-500 mt-1">{service.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    ️ {service.duration} min ·  ${service.defaultPrice}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200"
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

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {editingService ? "Editar Servicio" : "Nuevo Servicio Médico"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Ej: Consulta General"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Descripción del servicio..."
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
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
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
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
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