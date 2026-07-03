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
  { id: "pendiente", label: "⏳ Pendiente", color: "bg-yellow-100 text-yellow-800" },
  { id: "atendido", label: "✅ Atendido", color: "bg-green-100 text-green-800" },
  { id: "facturado", label: "💰 Facturado", color: "bg-blue-100 text-blue-800" }
];

export default function VetServices() {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedService, setSelectedService] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "vet_services"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0;
          const bTime = b.timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setServices(data);
      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  // Subir archivo a Cloudinary
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
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        setAttachments([
          ...attachments,
          {
            url: data.secure_url,
            name: file.name,
            type: file.type,
            uploadedAt: new Date()
          }
        ]);
      } else {
        alert("Error al subir el archivo");
      }
    } catch (error) {
      console.error("Error subiendo:", error);
      alert("Error al subir el archivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Eliminar adjunto
  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Abrir detalle del servicio
  const handleOpenDetail = (service) => {
    setSelectedService(service);
    setClinicalNotes(service.clinicalNotes || "");
    setDiagnosis(service.diagnosis || "");
    setTreatment(service.treatment || "");
    setAttachments(service.attachments || []);
  };

  // Guardar notas y cambiar estado
  const handleSaveNotes = async () => {
    if (!selectedService) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, "vet_services", selectedService.id), {
        clinicalNotes,
        diagnosis,
        treatment,
        attachments,
        status: "atendido",
        attendedAt: serverTimestamp(),
        attendedBy: currentUser?.uid,
        attendedByEmail: userData?.email
      });
      setSelectedService(null);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar notas");
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = filterStatus === "all"
    ? services
    : services.filter((s) => s.status === filterStatus);

  // Estadísticas del día
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayServices = services.filter((s) => {
    const sDate = s.timestamp?.toDate ? s.timestamp.toDate() : new Date(s.timestamp);
    return sDate >= today;
  });
  const pending = todayServices.filter((s) => s.status === "pendiente").length;
  const attended = todayServices.filter((s) => s.status === "atendido").length;
  const todayRevenue = todayServices
    .filter((s) => s.status === "facturado")
    .reduce((sum, s) => sum + (s.cost || 0), 0);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Pendientes hoy</div>
          <div className="text-3xl font-bold text-yellow-600 mt-1">{pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Atendidos hoy</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{attended}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 uppercase">Generado hoy</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">${todayRevenue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all", label: "Todos" },
          { id: "pendiente", label: "Pendientes" },
          { id: "atendido", label: "Atendidos" },
          { id: "facturado", label: "Facturados" }
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

      {/* Lista */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
          No hay servicios en este estado
        </div>
      ) : (
        <div className="space-y-3">
          {filteredServices.map((service) => {
            const statusInfo = STATUS_OPTIONS.find((s) => s.id === service.status) || STATUS_OPTIONS[0];
            const date = service.timestamp?.toDate ? service.timestamp.toDate() : new Date(service.timestamp);

            return (
              <div key={service.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">🐾 {service.petName}</h3>
                    <p className="text-sm text-gray-500"> {service.ownerName} · 📞 {service.ownerPhone}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <strong>Servicio:</strong> {service.serviceName}
                </div>

                {service.registeredBy && (
                  <div className="text-xs text-gray-400 mb-3">
                    Registrado por: {service.registeredByEmail} · {date.toLocaleString("es-ES")}
                  </div>
                )}

                {service.clinicalNotes && (
                  <div className="bg-gray-50 p-3 rounded-md mb-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Notas clínicas:</div>
                    <div className="text-sm">{service.clinicalNotes}</div>
                    {service.diagnosis && (
                      <div className="text-sm mt-2">
                        <strong>Diagnóstico:</strong> {service.diagnosis}
                      </div>
                    )}
                    {service.treatment && (
                      <div className="text-sm mt-2">
                        <strong>Tratamiento:</strong> {service.treatment}
                      </div>
                    )}
                  </div>
                )}

                {service.attachments?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Archivos adjuntos:</div>
                    <div className="flex flex-wrap gap-2">
                      {service.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          📎 {att.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {service.status === "pendiente" && (
                  <button
                    onClick={() => handleOpenDetail(service)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    📝 Atender servicio
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de atención */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Atender: {selectedService.petName}</h3>
              <button
                onClick={() => setSelectedService(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div><strong>Mascota:</strong> {selectedService.petName}</div>
              <div><strong>Dueño:</strong> {selectedService.ownerName}</div>
              <div><strong>Servicio:</strong> {selectedService.serviceName}</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivos adjuntos (RX, estudios)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleUploadFile}
                disabled={uploading}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              {uploading && (
                <div className="text-xs text-indigo-600 mt-1">Subiendo...</div>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        📎 {att.name}
                      </a>
                      <button
                        onClick={() => handleRemoveAttachment(i)}
                        className="text-red-500 hover:text-red-700 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "✅ Guardar y marcar como atendido"}
              </button>
              <button
                onClick={() => setSelectedService(null)}
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
