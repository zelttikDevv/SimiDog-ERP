import { useState } from "react";
import { auth } from "../lib/firebase";
import { updatePassword, signOut } from "firebase/auth";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      // Actualizar contraseña en Firebase Auth
      await updatePassword(auth.currentUser, newPassword);

      // Marcar como cambiada en Firestore
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        passwordChanged: true
      });

      // Cerrar sesión para que inicie de nuevo
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Error cambiando contraseña:", err);
      setError("Error al cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            🔐 Cambiar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Es tu primer ingreso. Debes establecer una nueva contraseña.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                minLength="6"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                minLength="6"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
