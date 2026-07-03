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
  serverTimestamp
} from "firebase/firestore";

const ROLES = [
  { id: "admin", label: "Administrador" },
  { id: "recepcionista", label: "Recepcionista" },
  { id: "mvz", label: "Médico Veterinario (MVZ)" }
];

const BRANCHES = [
  { id: "sucursal-11av", label: "SimiDog 11av" },
  { id: "sucursal-65av", label: "SimiDog 65av" }
];

export default function AdminUsers() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    role: "recepcionista",
    branchId: "",
    newPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("branchId", "==", branchId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, [branchId]);

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ email: "", role: "recepcionista", branchId: "", newPassword: "" });
    setShowForm(true);
    setMessage("");
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      role: user.role || "recepcionista",
      branchId: user.branchId || "",
      newPassword: ""
    });
    setShowForm(true);
    setMessage("");
  };

  const handleSave = async () => {
    if (!formData.email.trim()) {
      setMessage("❌ Ingresa un email");
      return;
    }
    if (!formData.branchId && formData.role === "mvz") {
      setMessage("❌ Selecciona una sucursal para el MVZ");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const userData = {
        email: formData.email.trim(),
        role: formData.role,
        branchId: formData.branchId,
        updatedAt: serverTimestamp()
      };

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), userData);
        setMessage("✅ Usuario actualizado");
      } else {
        userData.createdAt = serverTimestamp();
        userData.active = true;
        await addDoc(collection(db, "users"), userData);
        setMessage("✅ Usuario creado");
      }

      setTimeout(() => {
        setShowForm(false);
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        active: !currentStatus,
        updatedAt: serverTimestamp()
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Usuarios</h2>
          <p className="text-sm text-gray-500">Gestiona los usuarios del sistema</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay usuarios registrados</div>
        ) : (
          <div className="divide-y">
            {users.map((user) => {
              const role = ROLES.find((r) => r.id === user.role);
              const branch = BRANCHES.find((b) => b.id === user.branchId);

              return (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {role?.label} {branch && `· ${branch.label}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id, user.active !== false)}
                      className={`text-xs px-3 py-1.5 rounded ${
                        user.active !== false
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {user.active !== false ? "⏸️ Desactivar" : "▶️ Activar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="usuario@simidog.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value, branchId: "" })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {formData.role === "mvz" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sucursal de trabajo *
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecciona una sucursal...</option>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña inicial (opcional)
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Dejar vacío para generar automática"
                />
              </div>
            )}

            {editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña (opcional)
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Dejar vacío para no cambiar"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si se ingresa, el usuario deberá cambiarla en su próximo login.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "💾 Guardar cambios"}
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