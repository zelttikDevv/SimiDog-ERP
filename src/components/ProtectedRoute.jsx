import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el usuario está desactivado
  if (userData?.active === false) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">⛔ Cuenta desactivada</h2>
          <p className="text-sm text-red-600">
            Tu cuenta ha sido desactivada. Contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  // Verificar si debe cambiar contraseña
  if (userData?.passwordChanged !== true) {
    return <Navigate to="/change-password" replace />;
  }

  // Verificar rol
  if (allowedRoles && !allowedRoles.includes(userData?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
