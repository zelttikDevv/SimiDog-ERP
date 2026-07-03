import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am a 8pm

const STATUS_COLORS = {
  programada: "bg-blue-100 text-blue-800 border-blue-300",
  en_consulta: "bg-yellow-100 text-yellow-800 border-yellow-300",
  atendida: "bg-green-100 text-green-800 border-green-300",
  cobrada: "bg-purple-100 text-purple-800 border-purple-300",
  cancelada: "bg-gray-100 text-gray-800 border-gray-300"
};

export default function AppointmentCalendar() {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";
  const userRole = userData?.role;

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Formulario
  const [petId, setPetId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // Cargar citas de la semana
  useEffect(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const q = query(
      collection(db, "appointments"),
      where("branchId", "==", branchId),
      where("scheduledDate", ">=", weekStart),
      where("scheduledDate", "<", weekEnd)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId, weekStart]);

  // Buscar mascota/dueño
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const ownersQuery = query(
        collection(db, "owners"),
        where("nameLower", ">=", searchTerm.toLowerCase()),
        where("nameLower", "<=", searchTerm.toLowerCase() + "\uf8ff")
      );
      const ownersSnapshot = await getDocs(ownersQuery);
      
      const results = [];
      for (const ownerDoc of ownersSnapshot.docs) {
        const owner = { id: ownerDoc.id, ...ownerDoc.data() };
        const petsQuery = query(
          collection(db, "pets"),
          where("ownerId", "==", owner.id)
        );
        const petsSnapshot = await getDocs(petsQuery);
        const pets = petsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        results.push({ owner, pets });
      }
      setSearchResults(results);
    } catch (error) {
      console.error("Error buscando:", error);
    }
  };

  const handleSelectPet = (owner, pet) => {
    setOwnerId(owner.id);
    setOwnerName(owner.name);
    setOwnerPhone(owner.phone || "");
    setPetId(pet.id);
    setPetName(pet.name);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSlotClick = (day, hour) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    
    setSelectedSlot({ day, hour, dateStr, timeStr });
    setAppointmentDate(dateStr);
    setAppointmentTime(timeStr);
    setShowForm(true);
  };

  const handleCreateAppointment = async () => {
    if (!petId || !appointmentDate || !appointmentTime) {
      alert("Completa mascota, fecha y hora");
      return;
    }

    setSaving(true);

    try {
      const scheduledDate = new Date(`${appointmentDate}T${appointmentTime}`);

      await addDoc(collection(db, "appointments"), {
        branchId,
        petId,
        petName,
        ownerId,
        ownerName,
        ownerPhone,
        scheduledDate,
        duration: parseInt(duration),
        reason,
        isUrgent,
        isWalkIn: false,
        status: "programada",
        mvzId: null,
        mvzName: null,
        procedures: [],
        clinicalNotes: "",
        diagnosis: "",
        treatment: "",
        attachments: [],
        transactionId: null,
        totalCost: 0,
        createdBy: currentUser?.uid,
        createdByEmail: userData?.email,
        createdAt: serverTimestamp()
      });

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al crear cita");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPetId("");
    setOwnerId("");
    setOwnerName("");
    setOwnerPhone("");
    setPetName("");
    setAppointmentDate("");
    setAppointmentTime("");
    setDuration("30");
    setReason("");
    setIsUrgent(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setWeekStart(newWeek);
  };

  const getAppointmentsForSlot = (day, hour) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split("T")[0];
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;

    return appointments.filter((apt) => {
      const aptDate = apt.scheduledDate?.toDate ? apt.scheduledDate.toDate() : new Date(apt.scheduledDate);
      const aptDateStr = aptDate.toISOString().split("T")[0];
      const aptTimeStr = `${aptDate.getHours().toString().padStart(2, "0")}:00`;
      return aptDateStr === dateStr && aptTimeStr === timeStr;
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando agenda...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Agenda de Citas</h2>
          <p className="text-sm text-gray-500">Semana del {weekStart.toLocaleDateString("es-ES")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="bg-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-300"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Hoy
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="bg-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-300"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header días */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 bg-gray-50 font-semibold text-sm">Hora</div>
            {DAYS.map((day, i) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + i);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={i} className={`p-3 text-center ${isToday ? "bg-indigo-50" : ""}`}>
                  <div className="font-semibold text-sm">{day}</div>
                  <div className="text-xs text-gray-500">{date.getDate()}/{date.getMonth() + 1}</div>
                </div>
              );
            })}
          </div>

          {/* Slots de hora */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="p-3 bg-gray-50 text-sm font-medium">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {DAYS.map((_, dayIndex) => {
                const slotAppointments = getAppointmentsForSlot(dayIndex, hour);
                
                return (
                  <div
                    key={dayIndex}
                    onClick={() => handleSlotClick(dayIndex, hour)}
                    className="p-2 border-l min-h-[60px] cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {slotAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-xs p-1.5 rounded border mb-1 ${STATUS_COLORS[apt.status] || STATUS_COLORS.programada}`}
                      >
                        <div className="font-semibold truncate">{apt.petName}</div>
                        <div className="truncate text-[10px]">{apt.ownerName}</div>
                        {apt.isUrgent && (
                          <div className="text-[10px] font-bold text-red-600"> URGENTE</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal crear cita */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Nueva Cita</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-indigo-50 p-3 rounded-md text-sm">
              <div><strong>Fecha:</strong> {appointmentDate}</div>
              <div><strong>Hora:</strong> {appointmentTime}</div>
            </div>

            {/* Buscar mascota */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar mascota/dueño *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 border rounded-md px-3 py-2 text-sm"
                  placeholder="Nombre del dueño o mascota..."
                />
                <button
                  onClick={handleSearch}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
                >
                  Buscar
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div key={result.owner.id} className="p-3 border-b">
                      <div className="font-medium text-sm">👤 {result.owner.name}</div>
                      <div className="text-xs text-gray-500 mb-2">📞 {result.owner.phone}</div>
                      {result.pets.map((pet) => (
                        <button
                          key={pet.id}
                          onClick={() => handleSelectPet(result.owner, pet)}
                          className="w-full text-left bg-gray-50 hover:bg-indigo-50 rounded px-2 py-1 text-sm mb-1"
                        >
                          🐾 {pet.name} · {pet.type} · {pet.breed || "Sin raza"}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {petName && (
              <div className="bg-green-50 p-3 rounded-md text-sm">
                <div><strong>Mascota:</strong> {petName}</div>
                <div><strong>Dueño:</strong> {ownerName}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">🚨 Es urgencia</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Descripción del motivo..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateAppointment}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Creando..." : "✅ Crear Cita"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}