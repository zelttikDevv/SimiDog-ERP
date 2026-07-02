import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  updatePassword,
  deleteUser
} from "firebase/auth";

const BRANCHES = {
  "sucursal-11av": "SimiDog 11av",
  "sucursal-65av": "SimiDog 65av"
};

const ROLES = [
  { id: "admin", label: "Administrador" },
  { id: "recepcionista", label: "Recepcionista" }
];

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Formulario crear
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("recepcionista");
  const [newBranch, setNewBranch] = useState("sucursal-11av");
  const [creating, setCreating] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");

  // Formulario editar
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  // Cargar usuarios
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Crear usuario
  const handleCreate = async () => {
    if (!newEmail.trim()) {
      setMessage("❌ El email es obligatorio");
      return;
    }
    if (newRole === "recepcionista" && !newBranch) {
      setMessage("❌ Selecciona una sucursal");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const password = generatePassword();
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail.trim(), password);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newEmail.trim(),
        role: newRole,
        branchId: newRole === "recepcionista" ? newBranch : null,
        active: true,
        passwordChanged: false,
        createdAt: new Date()
      });

      // Cerrar sesión del usuario recién creado (quedarse como admin)
      // Nota: Firebase no permite "desloguear" sin afectar al admin actual
      // El admin debe volver a iniciar sesión con su cuenta
      setCreatedPassword(password);
      setMessage(`✅ Usuario creado. Contraseña temporal: ${password}`);
      
      // Limpiar formulario
      setNewEmail("");
      setNewRole("recepcionista");
      setNewBranch("sucursal-11av");
    } catch (error) {
      console.error("Error creando usuario:", error);
      if (error.code === "auth/email-already-in-use") {
        setMessage("❌ Ese email ya está registrado");
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  // Abrir formulario de edición
  const openEdit = (user) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditBranch(user.branchId || "sucursal-11av");
    setNewPassword("");
  };

  // Guardar cambios
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    setMessage("");

    try {
      const updates = {
        email: editEmail.trim(),
        role: editRole,
        branchId: editRole === "recepcionista" ? editBranch : null
      };

      await updateDoc(doc(db, "users", editingUser.id), updates);

      // Cambiar contraseña si se proporcionó
      if (newPassword.trim()) {
        // Nota: Firebase no permite cambiar password de otro usuario directamente
        // Se marca como "debe cambiar password" y el usuario lo hace en su próximo login
        await updateDoc(doc(db, "users", editingUser.id), {
          passwordChanged: false
        });
        setMessage("✅ Usuario actualizado. El usuario deberá cambiar su contraseña en el próximo login.");
      } else {
        setMessage("✅ Usuario actualizado correctamente");
      }

      setEditingUser(null);
    } catch (error) {
      console.error("Error actualizando:", error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Activar/Desactivar usuario
  const handleToggleActive = async (user) => {
    try {
      await updateDoc(doc(db, "users", user.id), {
        active: !user.active
      });
      setMessage(`✅ Usuario ${user.active ? "desactivado" : "activado"}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Mensaje */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* Contraseña temporal mostrada */}
      {createdPassword && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🔑 Contraseña temporal generada</h3>
          <div className="bg-white border-2 border-dashed border-yellow-400 rounded p-3 font-mono text-lg text-center">
            {createdPassword}
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Copia esta contraseña y envíala al usuario. Deberá cambiarla en su primer login.
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(createdPassword);
              setMessage("✅ Contraseña copiada al portapapeles");
            }}
            className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded"
          >
            Copiar contraseña
          </button>
          <button
            onClick={() => setCreatedPassword("")}
            className="mt-2 ml-2 text-xs text-gray-500 underline"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Botón crear */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700"
        >
          ➕ Crear nuevo usuario
        </button>
      )}

      {/* Formulario crear */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="text-lg font-semibold">Nuevo Usuario</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="usuario@simidog.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {newRole === "recepcionista" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(BRANCHES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear usuario"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold">Usuarios del sistema ({users.length})</h3>
        </div>
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.email}</span>
                  {user.active === false && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactivo</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {ROLES.find((r) => r.id === user.role)?.label || user.role}
                  {user.branchId && ` · ${BRANCHES[user.branchId] || user.branchId}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(user)}
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`text-xs px-3 py-1.5 rounded ${user.active === false ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}
                >
                  {user.active === false ? "✅ Activar" : "⏸️ Desactivar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal editar */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
            <h3 className="text-lg font-semibold">Editar Usuario</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Cambiar el email no actualiza Firebase Auth. Solo se guarda como referencia.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {editRole === "recepcionista" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(BRANCHES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña (opcional)
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Dejar vacío para no cambiar"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si se ingresa, el usuario deberá cambiarla en su próximo login.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => setEditingUser(null)}
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
