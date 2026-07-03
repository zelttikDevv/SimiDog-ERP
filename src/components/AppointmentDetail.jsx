import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const CLOUDINARY_CLOUD_NAME = "j1gd05xx";
const CLOUDINARY_UPLOAD_PRESET = "simidog-uploads";

const STATUS_OPTIONS = [
  { id: "programada", label: "📅 Programada", color: "bg-blue-100 text-blue-800" },
  { id: "en_consulta", label: "🩺 En Consulta", color: "bg-yellow-100 text-yellow-800" },
  { id: "atendida", label: "✅ Atendida", color: "bg-green-100 text-green-800" },
  { id: "cobrada", label: "💰 Cobrada", color: "bg-purple-100 text-purple-800" },
  { id: "cancelada", label: "❌ Cancelada", color: "bg-gray-100 text-gray-800" }
];

export default function AppointmentDetail() {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [appointments, setAppointments] = useState([]);
  const [medicalServices, setMedicalServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("programada");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [petHistory, setPetHistory] = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar citas
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const q = query(
      collection(db, "appointments"),
      where("branchId", "==", branchId),
      where("scheduledDate", ">=", today),
      where("scheduledDate", "<", nextMonth)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.scheduledDate?.toMillis?.() || 0;
          const bTime = b.scheduledDate?.toMillis?.() || 0;
          return aTime - bTime;
        });
      setAppointments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  // Cargar servicios médicos del catálogo
  useEffect(() => {
    const q = query(
      collection(db, "medical_services"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.active !== false);
      setMedicalServices(data);
    });

    return unsubscribe;
  }, [branchId]);

  // Cargar historial de la mascota cuando se selecciona una cita
  useEffect(() => {
    if (selectedAppointment?.petId) {
      const petRef = doc(db, "pets", selectedAppointment.petId);
      // Usamos onSnapshot para tener datos en tiempo real
      const unsub = onSnapshot(petRef, (docSnap) => {
        if (docSnap.exists()) {
          const petData = docSnap.data();
          setPetHistory(petData.clinicalHistory || []);
        } else {
          setPetHistory([]);
        }
      });
      return unsub;
    } else {
      setPetHistory([]);
    }
  }, [selectedAppointment?.petId]);

  const handleOpenAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setSelectedProcedures(appointment.procedures || []);
    setClinicalNotes(appointment.clinicalNotes || "");
    setDiagnosis(appointment.diagnosis || "");
    setTreatment(appointment.treatment || "");
    setAttachments(appointment.attachments || []);

    if (appointment.status === "programada") {
      updateDoc(doc(db, "appointments", appointment.id), {
        status: "en_consulta",
        mvzId: currentUser?.uid,
        mvzName: userData?.email
      });
    }
  };

  const handleAddProcedure = (service) => {
    const existing = selectedProcedures.find((p) => p.id === service.id);
    if (existing) {
      alert("Este servicio ya fue agregado");
      return;
    }

    setSelectedProcedures([
      ...selectedProcedures,
      {
        id: service.id,
        name: service.name,
        cost: service.defaultPrice,
        notes: ""
      }
    ]);
  };

  const handleRemoveProcedure = (procedureId) => {
    setSelectedProcedures(selectedProcedures.filter((p) => p.id !== procedureId));
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "simidog/medical");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (data.secure_url) {
        setAttachments([
          ...attachments,
          { url: data.secure_url, name: file.name, type: file.type }
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!selectedAppointment) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, "appointments", selectedAppointment.id), {
        procedures: selectedProcedures,
        clinicalNotes,
        diagnosis,
        treatment,
        attachments,
        status: "atendida",
        attendedAt: serverTimestamp(),
        mvzId: currentUser?.uid,
        mvzName: userData?.email
      });

      setSelectedAppointment(null);
      alert("✅ Cita atendida. La recepción puede cobrar ahora.");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const filteredAppointments = filterStatus === "all"
    ? appointments
    : appointments.filter((a) => a.status === filterStatus);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "programada", label: "Programadas" },
          { id: "en_consulta", label: "En Consulta" },
          { id: "atendida", label: "Atendidas" },
          { id: "cobrada", label: "Cobradas" },
          { id: "all", label: "Todas" }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filterStatus === f.id ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
          No hay citas en este estado
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const statusInfo = STATUS_OPTIONS.find((s) => s.id === apt.status) || STATUS_OPTIONS[0];
            const date = apt.scheduledDate?.toDate ? apt.scheduledDate.toDate() : new Date(apt.scheduledDate);

            return (
              <div key={apt.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">🐾 {apt.petName}</h3>
                      {apt.isUrgent && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                          🚨 URGENTE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      👤 {apt.ownerName} · 📞 {apt.ownerPhone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                       {date.toLocaleString("es-ES")} · ️ {apt.duration} min
                      {apt.mvzName && ` · 👨‍⚕️ ${apt.mvzName}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {apt.reason && (
                  <div className="bg-gray-50 p-3 rounded-md mb-3 text-sm">
                    <strong>Motivo:</strong> {apt.reason}
                  </div>
                )}

                {apt.procedures?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Procedimientos:</div>
                    <div className="flex flex-wrap gap-2">
                      {apt.procedures.map((proc, i) => (
                        <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                          {proc.name} - ${proc.cost}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(apt.status === "programada" || apt.status === "en_consulta") && (
                  <button
                    onClick={() => handleOpenAppointment(apt)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    {apt.status === "programada" ? "🩺 Iniciar Consulta" : "📝 Continuar Atención"}
                  </button>
                )}

                {apt.status === "atendida" && (
                  <div className="bg-green-50 p-3 rounded-md text-sm text-green-700">
                    ✅ Atendida - Esperando cobro en POS
                  </div>
                )}

                {apt.status === "cobrada" && (
                  <div className="bg-purple-50 p-3 rounded-md text-sm text-purple-700">
                    💰 Cobrada - Ticket #{apt.transactionId?.slice(-6) || "N/A"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Atendiendo: {selectedAppointment.petName}</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div><strong>Mascota:</strong> {selectedAppointment.petName}</div>
              <div><strong>Dueño:</strong> {selectedAppointment.ownerName}</div>
              <div><strong>Motivo:</strong> {selectedAppointment.reason || "N/A"}</div>
            </div>

            {/* Historial clínico de la mascota */}
            {petHistory.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Historial Clínico ({petHistory.length} visitas previas)</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {petHistory.slice().reverse().map((visit, i) => (
                    <div key={i} className="bg-white p-2 rounded text-xs">
                      <div className="font-semibold text-blue-700">
                        {visit.date ? new Date(visit.date.toDate ? visit.date.toDate() : visit.date).toLocaleDateString("es-ES") : "Sin fecha"}
                        {visit.mvzName && ` · 👨‍⚕️ ${visit.mvzName}`}
                      </div>
                      {visit.procedures?.length > 0 && (
                        <div className="text-gray-600 mt-1">
                          <strong>Procedimientos:</strong> {visit.procedures.map((p) => p.name).join(", ")}
                        </div>
                      )}
                      {visit.diagnosis && (
                        <div className="text-gray-600"><strong>Dx:</strong> {visit.diagnosis}</div>
                      )}
                      {visit.treatment && (
                        <div className="text-gray-600"><strong>Tx:</strong> {visit.treatment}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {petHistory.length === 0 && selectedAppointment.petId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                ✅ Primera visita de esta mascota
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedimientos a realizar
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3 max-h-48 overflow-y-auto">
                {medicalServices.map((service) => {
                  const isSelected = selectedProcedures.find((p) => p.id === service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleAddProcedure(service)}
                      disabled={isSelected}
                      className={`text-left border rounded-md p-2 text-sm ${
                        isSelected
                          ? "bg-green-100 border-green-300 opacity-50"
                          : "hover:bg-indigo-50"
                      }`}
                    >
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-gray-500">${service.defaultPrice}</div>
                    </button>
                  );
                })}
              </div>

              {selectedProcedures.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-600">Seleccionados:</div>
                  {selectedProcedures.map((proc) => (
                    <div key={proc.id} className="flex justify-between items-center bg-indigo-50 p-2 rounded">
                      <span className="text-sm">{proc.name} - ${proc.cost}</span>
                      <button
                        onClick={() => handleRemoveProcedure(proc.id)}
                        className="text-red-500 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="text-right font-bold text-sm pt-2">
                    Total: ${selectedProcedures.reduce((sum, p) => sum + p.cost, 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas clínicas</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows="3"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Observaciones de la consulta..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Diagnóstico..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
              <textarea
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Tratamiento indicado..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivos (RX, estudios)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleUploadFile}
                disabled={uploading}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              {uploading && <div className="text-xs text-indigo-600 mt-1">Subiendo...</div>}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                         {att.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || selectedProcedures.length === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "✅ Guardar y Marcar Atendida"}
              </button>
              <button
                onClick={() => setSelectedAppointment(null)}
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