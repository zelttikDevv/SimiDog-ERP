import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function MigrateUsers() {
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, msg]);
  };

  const runMigration = async () => {
    setRunning(true);
    setLogs([]);
    setStatus("Iniciando migración de usuarios...");

    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      addLog(`📋 Encontrados ${usersSnapshot.size} usuarios`);

      let updated = 0;
      for (const docSnap of usersSnapshot.docs) {
        const data = docSnap.data();
        
        // Agregar campos faltantes
        const updates = {};
        if (data.passwordChanged !== true) {
          updates.passwordChanged = true;
        }
        if (data.active === undefined) {
          updates.active = true;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "users", docSnap.id), updates);
          addLog(`✅ ${data.email} actualizado`);
          updated++;
        } else {
          addLog(`⏭️ ${data.email} ya estaba actualizado`);
        }
      }

      addLog(`\n🎉 Migración completada: ${updated} usuarios actualizados`);
      setStatus("✅ Migración completada exitosamente");
    } catch (error) {
      console.error("Error:", error);
      addLog(`❌ Error: ${error.message}`);
      setStatus("❌ Error durante la migración");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">🔧 Migración de Usuarios</h1>
          <p className="text-gray-600 mb-4">
            Este script agrega los campos <code>passwordChanged: true</code> y <code>active: true</code> a los usuarios existentes.
          </p>

          <button
            onClick={runMigration}
            disabled={running}
            className="w-full bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 mb-4"
          >
            {running ? "Ejecutando..." : "Ejecutar Migración"}
          </button>

          {status && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="font-semibold">{status}</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-gray-900 text-green-400 rounded p-4 font-mono text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Importante:</strong> Después de ejecutar, elimina este archivo de GitHub.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
      }
