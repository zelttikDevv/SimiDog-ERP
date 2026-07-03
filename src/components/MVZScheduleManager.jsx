import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const DAYS = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" }
];

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

export default function MVZScheduleManager() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";
  const mvzId = userData?.uid;

  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Cargar horarios
  useEffect(() => {
    const q = query(
      collection(db, "mvz_schedules"),
      where("branchId", "==", branchId),
      where("mvzId", "==", mvzId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setSchedule(data.days || {});
      } else {
        // Horario por defecto
        const defaultSchedule = {};
        DAYS.forEach((day) => {
          defaultSchedule[day.id] = {
            enabled: day.id !== "sunday",
            slots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"]
          };
        });
        setSchedule(defaultSchedule);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId, mvzId]);

  // Toggle día
  const toggleDay = (dayId) => {
    setSchedule({
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        enabled: !schedule[dayId]?.enabled
      }
    });
  };

  // Toggle slot
  const toggleSlot = (dayId, slot) => {
    const currentSlots = schedule[dayId]?.slots || [];
    const newSlots = currentSlots.includes(slot)
      ? currentSlots.filter((s) => s !== slot)
      : [...currentSlots].sort();

    setSchedule({
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        slots: newSlots
      }
    });
  };

  // Guardar horarios
  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      await setDoc(doc(db, "mvz_schedules", `${branchId}_${mvzId}`), {
        branchId,
        mvzId,
        mvzEmail: userData?.email,
        days: schedule,
        updatedAt: serverTimestamp()
      });

      setMessage("✅ Horarios guardados correctamente");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Mis Horarios Disponibles</h2>
        <p className="text-sm text-gray-500">Define tus horarios de atención por día</p>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {DAYS.map((day) => {
          const daySchedule = schedule[day.id] || { enabled: false, slots: [] };
          
          return (
            <div key={day.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={daySchedule.enabled}
                    onChange={() => toggleDay(day.id)}
                    className="rounded"
                  />
                  <span className="font-medium">{day.label}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {daySchedule.slots.length} horarios disponibles
                </span>
              </div>

              {daySchedule.enabled && (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(day.id, slot)}
                      className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                        daySchedule.slots.includes(slot)
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "💾 Guardar Horarios"}
      </button>
    </div>
  );
}