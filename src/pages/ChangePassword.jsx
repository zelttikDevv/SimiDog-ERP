import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";

export default function ChangePassword() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    // Validaciones
    if (!currentPassword) {
      setMessage("❌ Ingresa tu contraseña actual");
      setMessageType("error");
      return;
    }

    if (!newPassword) {
      setMessage("❌ Ingresa la nueva contraseña");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("❌ La nueva contraseña debe tener al menos 6 caracteres");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("❌ Las contraseñas nuevas no coinciden");
      setMessageType("error");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("❌ La nueva contraseña debe ser diferente a la actual");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      // Reautenticar con la contraseña actual
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Cambiar contraseña
      await updatePassword(currentUser, newPassword);

      setMessage("✅ Contraseña cambiada correctamente. Serás redirigido al login.");
      setMessageType("success");

      // Cerrar sesión y redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Error cambiando contraseña:", error);

      if (error.code === "auth/wrong-password") {
        setMessage("❌ La contraseña actual es incorrecta");
      } else if (error.code === "auth/requires-recent-login") {
        setMessage("⚠️ Por seguridad, debes cerrar sesión e iniciar sesión de nuevo antes de cambiar la contraseña");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else if (error.code === "auth/weak-password") {
        setMessage("❌ La nueva contraseña es muy débil");
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cambiar Contraseña</h2>
            <p className="text-sm text-slate-500 mt-1">{currentUser?.email}</p>
          </div>

          {/* Mensajes */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                messageType === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Contraseña actual */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa tu contraseña actual"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repite la nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Cambiando..." : "Cambiar Contraseña"}
            </button>
          </form>

          {/* Botón volver */}
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}