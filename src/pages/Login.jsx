import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Chrome } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/admin");
    } catch (error) {
      console.error("Error de login:", error);
      
      let errorMessage = "Error al iniciar sesión";
      
      if (error.code === "auth/invalid-credential") {
        errorMessage = "❌ Email o contraseña incorrectos";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "❌ Usuario no encontrado";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "❌ Contraseña incorrecta";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "❌ Este usuario está deshabilitado";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "❌ Demasiados intentos. Espera unos minutos";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "❌ Email inválido";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario existe en Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Crear documento si no existe (solo si es la primera vez)
        await setDoc(userRef, {
          email: user.email,
          role: "recepcionista", // Rol por defecto, el admin puede cambiarlo
          branchId: "sucursal-11av", // Sucursal por defecto
          active: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // Actualizar último login
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }

      // Verificar si está activo
      if (userSnap.exists() && userSnap.data().active === false) {
        await auth.signOut();
        setError("❌ Tu cuenta está desactivada. Contacta al administrador");
        setLoading(false);
        return;
      }

      navigate("/admin");
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
        {/* Logo y título */}
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

          {/* Botón Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 shadow-sm"
          >
            <Chrome className="w-5 h-5" />
            <span>Acceder con Google</span>
          </button>

          {/* Separador */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">o continúa con email</span>
            </div>
          </div>

          {/* Formulario email/contraseña */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-600 mt-6">
          ¿Problemas para entrar? Contacta al administrador
        </p>
      </div>
    </div>
  );
          }
