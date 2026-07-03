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

const COLECCIONES_A_ELIMINAR = [
  'cash_registers', 'coupons', 'internal_consumptions',
  'owners', 'pets', 'products', 'services',
  'transactions', 'vet_services', 'appointments',
  'medical_services', 'bath_services', 'mvz_schedules', 'consumptions'
];

const NUEVOS_USUARIOS = [
  { email: 'mvz1@simidog.com', password: 'mvz123456', role: 'mvz', branchId: 'sucursal-11av' },
  { email: 'mvz2@simidog.com', password: 'mvz123456', role: 'mvz', branchId: 'sucursal-65av' },
  { email: 'recep1@simidog.com', password: 'recep123456', role: 'recepcionista', branchId: 'sucursal-11av' },
  { email: 'recep2@simidog.com', password: 'recep123456', role: 'recepcionista', branchId: 'sucursal-65av' }
];

export default function Cleanup() {
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const log = (msg) => setLogs((prev) => [...prev, msg]);

  const runCleanup = async () => {
    setRunning(true);
    setLogs([]);
    log(" Iniciando limpieza total...");

    try {
      // Verificar admin logueado
      if (!auth.currentUser) {
        log("❌ Debes iniciar sesión como admin primero");
        setRunning(false);
        return;
      }
      log(`✅ Admin logueado: ${auth.currentUser.email}`);

      // PASO 1: Eliminar colecciones
      log("\n🗑️ Eliminando colecciones...");
      for (const coleccion of COLECCIONES_A_ELIMINAR) {
        try {
          const snapshot = await getDocs(collection(db, coleccion));
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          log(`✅ Eliminada: ${coleccion} (${snapshot.size} docs)`);
        } catch (e) {
          log(`⚠️ ${coleccion}: ${e.message}`);
        }
      }

      // PASO 2: Eliminar usuarios excepto admin
      log("\n️ Eliminando usuarios (excepto admin)...");
      const usersSnap = await getDocs(collection(db, "users"));
      const batch2 = writeBatch(db);
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.role === "admin" && data.email === "admin@simidog.com") {
          log(`✅ Manteniendo admin: ${data.email}`);
        } else {
          batch2.delete(d.ref);
          log(`🗑️ Eliminando: ${data.email}`);
        }
      });
      await batch2.commit();

      // PASO 3: Crear nuevos usuarios
      log("\n👥 Creando nuevos usuarios...");
      for (const u of NUEVOS_USUARIOS) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
          await setDoc(doc(db, "users", cred.user.uid), {
            email: u.email,
            role: u.role,
            branchId: u.branchId,
            active: true,
            createdAt: new Date()
          });
          log(`✅ Creado: ${u.email} (${u.role})`);
        } catch (e) {
          if (e.code === "auth/email-already-in-use") {
            log(`⚠️ ${u.email} ya existe, buscando...`);
            const snap = await getDocs(query(collection(db, "users"), where("email", "==", u.email)));
            if (!snap.empty) {
              await updateDoc(doc(db, "users", snap.docs[0].id), {
                role: u.role,
                branchId: u.branchId,
                active: true
              });
              log(`✅ Actualizado: ${u.email}`);
            }
          } else {
            log(`❌ Error ${u.email}: ${e.message}`);
          }
        }
      }

      // PASO 4: Datos de prueba
      log("\n📝 Creando datos de prueba...");

      await setDoc(doc(db, "owners", "owner-test-001"), {
        name: "Cristal Guzman",
        nameLower: "cristal guzman",
        phone: "9870123456",
        address: "C 9 sur x av 15 y 20",
        createdAt: new Date()
      });
      log("✅ Dueño: Cristal Guzman");

      await setDoc(doc(db, "owners", "owner-test-001", "pets", "pet-test-001"), {
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
      log("✅ Producto consumo");

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
      log("✅ Producto tienda");

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
      log("✅ Servicio médico");

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
      log("✅ Servicio de baño");

      log("\n🎉 ¡LISTO! Base de datos limpia y configurada");
      setDone(true);
    } catch (e) {
      log(`❌ ERROR GENERAL: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) {
      log("⚠️ No hay usuario logueado. Inicia sesión como admin primero.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🧹 Limpieza de Base de Datos</h1>
            <p className="text-sm text-slate-500">Ejecutar solo una vez como admin</p>
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
            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 mb-4"
          >
            {running ? "⏳ Ejecutando..." : "🚀 EJECUTAR LIMPIEZA"}
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