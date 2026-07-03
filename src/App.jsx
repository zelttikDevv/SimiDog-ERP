import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import PublicPanel from "./pages/PublicPanel";
import ChangePassword from "./pages/ChangePassword";
import MVZDashboard from "./pages/MVZDashboard";  // ← Al inicio

function AppContent() {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Panel público (sin login) */}
        <Route path="/panel/:branch" element={<PublicPanel />} />
        
        
// Dentro de <Routes>, agrega:
<Route
  path="/mvz"
  element={
    <ProtectedRoute allowedRoles={["mvz", "admin"]}>
      <MVZDashboard />
    </ProtectedRoute>
  }
/>
        {/* Cambio de contraseña (requiere login) */}
        <Route
          path="/change-password"
          element={
            currentUser ? <ChangePassword /> : <Navigate to="/login" replace />
          }
        />
        
        {/* Login */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to={userData?.role === "admin" ? "/admin" : "/recepcion"} replace />
            ) : (
              <Login />
            )
          }
        />
        
        {/* Panel Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Panel Recepcionista */}
        <Route
          path="/recepcion"
          element={
            <ProtectedRoute allowedRoles={["recepcionista", "admin"]}>
              <ReceptionistDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Ruta raíz */}
        <Route
          path="/"
          element={
            <Navigate
              to={currentUser ? (userData?.role === "admin" ? "/admin" : "/recepcion") : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
