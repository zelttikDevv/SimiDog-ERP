import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Chrome, LogOut } from "lucide-react";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser: authUser } = useAuth();
  const navigate = useNavigate();

  // Si ya está logueado, redirigir al dashboard correspondiente
  if (authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Chrome className="w-12 h-12 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Ya estás conectado</h2>
              <p className="text-slate-600 mt-2">{authUser.email}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate("/admin")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                Ir al Dashboard
              </button>
              
              <button
                onClick={async () => {
                  await signOut(auth);
                  setError("");
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-200 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar o crear documento en Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Usuario nuevo - crear con rol admin por defecto (cambiar después)
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "admin", // ← CAMBIA ESTO según el usuario
          branchId: null,
          active: true,
          emailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          authProvider: "google",
          passwordChanged: true // ← IMPORTANTE: marcar como cambiado
        });
      } else {
        // Usuario existente - actualizar y asegurar que no pida cambio
        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          emailVerified: user.emailVerified,
          photoURL: user.photoURL || userSnap.data().photoURL,
          name: user.displayName || userSnap.data().name,
          passwordChanged: true, // ← ASEGURAR que no pida cambio
          mustChangePassword: false,
          forcePasswordChange: false
        });
      }

      // Redirigir según rol - SIN pasar por change-password
      const userData = userSnap.exists() ? userSnap.data() : { role: "admin" };
      
      if (userData.role === "admin") {
        navigate("/admin");
      } else if (userData.role === "mvz") {
        navigate("/mvz");
      } else if (userData.role === "recepcionista") {
        navigate("/receptionist");
      } else {
        navigate("/admin"); // default
      }
      
    } catch (error) {
      console.error("Error con Google:", error);
      
      if (error.code === "auth/popup-closed-by-user") {
        setError("❌ Inicio de sesión cancelado");
      } else if (error.code === "auth/account-exists-with-different-credential") {
        setError("❌ Este email ya está registrado con otra forma de acceso");
      } else {
        setError("❌ Error al iniciar sesión con Google");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">SimiDog</h1>
          <p className="text-slate-600 mt-2">Sistema de Gestión Veterinaria</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-300 text-slate-700 py-4 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            <Chrome className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold">Acceder con Google</div>
              <div className="text-xs text-slate-500">Recomendado - Más seguro y rápido</div>
            </div>
          </button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1"> Seguridad mejorada:</p>
            <ul className="space-y-1 text-xs">
              <li>• Sin contraseñas que recordar</li>
              <li>• Acceso rápido con 1 clic</li>
              <li>• Protección contra hackers</li>
            </ul>
          </div>

          {/* Soporte */}
          <div className="text-center text-sm text-slate-600">
            <p>¿Problemas para entrar?</p>
            <p className="font-medium">Contacta al administrador: admin@simidog.com</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 SimiDog ERP - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}