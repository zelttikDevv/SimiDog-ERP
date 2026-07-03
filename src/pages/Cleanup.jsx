import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Cleanup() {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const log = (msg) => setLogs((prev) => [...prev, msg]);

  const runCleanup = async () => {
    setRunning(true);
    setLogs([]);
    log("🚀 Continuando limpieza...");

    try {
      if (!auth.currentUser) {
        log("❌ Debes iniciar sesión como admin primero");
        setRunning(false);
        return;
      }
      log(`✅ Admin logueado: ${auth.currentUser.email}`);

      // Crear mascota en colección separada (no subcolección)
      log("\n📝 Creando mascota...");
      await setDoc(doc(db, "pets", "pet-test-001"), {
        name: "Kira",
        nameLower: "kira",
        type: "perro",
        breed: "Labrador",
        age: 3,
        weight: 25.5,
        sex: "hembra",
        ownerId: "owner-test-001",
        createdAt: new Date()
      });
      log("✅ Mascota: Kira");

      // Productos
      log("\n📦 Creando productos...");
      await setDoc(doc(db, "products", "prod-consumo-001"), {
        name: "Alimento Premium Perro 15kg",
        price: 450,
        stock: 50,
        unit: "bolsa",
        type: "consumo",
        branchId: "sucursal-11av",
        active: true,
        createdAt: new Date()
      });
      log("✅ Producto consumo: Alimento Premium");

      await setDoc(doc(db, "products", "prod-tienda-001"), {
        name: "Collar Antipulgas",
        price: 150,
        stock: 30,
        unit: "pieza",
        type: "tienda",
        branchId: "sucursal-11av",
        active: true,
        createdAt: new Date()
      });
      log("✅ Producto tienda: Collar Antipulgas");

      // Servicios médicos
      log("\n🏥 Creando servicios médicos...");
      await setDoc(doc(db, "medical_services", "med-service-001"), {
        name: "Consulta General",
        description: "Consulta veterinaria general",
        defaultPrice: 250,
        duration: 30,
        category: "consulta",
        branchId: "sucursal-11av",
        active: true,
        createdAt: new Date()
      });
      log("✅ Servicio médico: Consulta General");

      // Servicios de baño
      log("\n🛁 Creando servicios de baño...");
      await setDoc(doc(db, "bath_services", "bath-service-001"), {
        name: "Baño Perro Pequeño",
        description: "Baño completo para perro pequeño",
        defaultPrice: 150,
        duration: 60,
        size: "pequeno",
        serviceType: "bano",
        branchId: "sucursal-11av",
        active: true,
        createdAt: new Date()
      });
      log("✅ Servicio de baño: Baño Perro Pequeño");

      // Verificar usuarios
      log("\n👥 Verificando usuarios...");
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      log(`Total usuarios en Firestore: ${usersList.length}`);
      usersList.forEach(u => {
        log(`  - ${u.email} (${u.role}) - ${u.branchId || 'N/A'}`);
      });

      // Verificar que mvz1 existe
      const mvz1Exists = usersList.find(u => u.email === 'mvz1@simidog.com');
      if (!mvz1Exists) {
        log("\n⚠️ mvz1@simidog.com no existe en Firestore, creando...");
        try {
          const cred = await createUserWithEmailAndPassword(auth, 'mvz1@simidog.com', 'mvz123456');
          await setDoc(doc(db, "users", cred.user.uid), {
            email: 'mvz1@simidog.com',
            role: 'mvz',
            branchId: 'sucursal-11av',
            active: true,
            createdAt: new Date()
          });
          log("✅ Creado mvz1@simidog.com");
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') {
            log("⚠️ mvz1@simidog.com ya existe en Auth pero no en Firestore");
            log("⚠️ Necesitas crearlo manualmente en Firestore");
          } else {
            log(`❌ Error: ${e.message}`);
          }
        }
      }

      log("\n🎉 ¡LISTO! Base de datos configurada correctamente");
      setDone(true);
    } catch (e) {
      log(`❌ ERROR: ${e.message}`);
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🧹 Continuando Limpieza</h1>
            <p className="text-sm text-slate-500">Crear datos faltantes</p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Volver al admin
          </button>
        </div>

        {!done && (
          <button
            onClick={runCleanup}
            disabled={running || !auth.currentUser}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {running ? "⏳ Ejecutando..." : "🚀 CONTINUAR LIMPIEZA"}
          </button>
        )}

        {done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="font-bold text-green-800">✅ Limpieza completada</p>
            <p className="text-sm text-green-700 mt-1">Puedes eliminar este archivo (Cleanup.jsx) del proyecto</p>
          </div>
        )}

        <div className="bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500">Esperando ejecución...</p>
          ) : (
            logs.map((l, i) => <div key={i}>{l}</div>)
          )}
        </div>

        {done && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-bold text-blue-900 mb-2">🔐 Credenciales de prueba:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• mvz1@simidog.com / mvz123456 (11av)</li>
              <li>• mvz2@simidog.com / mvz123456 (65av)</li>
              <li>• recep1@simidog.com / recep123456 (11av)</li>
              <li>• recep2@simidog.com / recep123456 (65av)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}