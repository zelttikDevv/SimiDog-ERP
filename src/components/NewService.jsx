import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

const BRANCHES = {
  "sucursal-11av": "SimiDog 11av",
  "sucursal-65av": "SimiDog 65av"
};

const SERVICE_TYPES = [
  { id: "bano", label: "Solo Baño" },
  { id: "corte", label: "Solo Corte" },
  { id: "bano_y_corte", label: "Baño + Corte" }
];

const MODALITIES = [
  { id: "sucursal", label: "En sucursal" },
  { id: "domicilio", label: "Servicio a domicilio" }
];

export default function NewService() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";
  const branchName = BRANCHES[branchId] || "Sucursal";

  // Búsqueda
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Formulario nuevo dueño/mascota
  const [showNewForm, setShowNewForm] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("perro");
  const [petBreed, setPetBreed] = useState("");
  const [petNotes, setPetNotes] = useState("");

  // Servicio
  const [serviceType, setServiceType] = useState("bano");
  const [modality, setModality] = useState("sucursal");

  // Estado
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Buscar mascota por nombre
  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedPet(null);
    setSelectedOwner(null);
    setShowNewForm(false);

    try {
      const petsRef = collection(db, "pets");
      const q = query(petsRef, where("nameLower", ">=", searchName.toLowerCase()), where("nameLower", "<=", searchName.toLowerCase() + "\uf8ff"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("No se encontró ninguna mascota con ese nombre.");
        setShowNewForm(true);
        setPetName(searchName);
      } else {
        const results = [];
        for (const petDoc of snapshot.docs) {
          const pet = { id: petDoc.id, ...petDoc.data() };
          const ownerDoc = await getDocs(query(collection(db, "owners"), where("__name__", "==", pet.ownerId)));
          const owner = ownerDoc.empty ? null : { id: ownerDoc.docs[0].id, ...ownerDoc.docs[0].data() };
          results.push({ pet, owner });
        }
        setSearchResults(results);
        setMessage("");
      }
    } catch (error) {
      console.error("Error buscando:", error);
      setMessage("Error al buscar. Intenta de nuevo.");
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar mascota encontrada
  const handleSelectPet = (result) => {
    setSelectedPet(result.pet);
    setSelectedOwner(result.owner);
    setSearchResults([]);
    setShowNewForm(false);
    setMessage("");
  };

  // Registrar servicio
  const handleCreateService = async () => {
    setSaving(true);
    setMessage("");

    try {
      let finalPetId = selectedPet?.id;
      let finalOwnerId = selectedOwner?.id;

      // Si es nueva mascota, crear dueño y mascota
      if (showNewForm || !selectedPet) {
        if (!ownerName.trim() || !ownerPhone.trim() || !petName.trim()) {
          setMessage("Completa nombre del dueño, teléfono y nombre de la mascota.");
          setSaving(false);
          return;
        }

        // Crear dueño
        const ownerRef = await addDoc(collection(db, "owners"), {
          name: ownerName.trim(),
          phone: ownerPhone.trim(),
          address: ownerAddress.trim(),
          createdAt: serverTimestamp()
        });
        finalOwnerId = ownerRef.id;

        // Crear mascota
        const petRef = await addDoc(collection(db, "pets"), {
          ownerId: finalOwnerId,
          name: petName.trim(),
          nameLower: petName.trim().toLowerCase(),
          type: petType,
          breed: petBreed.trim(),
          notes: petNotes.trim(),
          createdAt: serverTimestamp()
        });
        finalPetId = petRef.id;
      }

      // Crear servicio (la sucursal viene del usuario logueado)
      await addDoc(collection(db, "services"), {
        petId: finalPetId,
        petName: selectedPet?.name || petName.trim(),
        ownerName: selectedOwner?.name || ownerName.trim(),
        ownerPhone: selectedOwner?.phone || ownerPhone.trim(),
        branchId: branchId, // ← Sucursal del usuario logueado
        serviceType,
        modality,
        status: "esperando_turno",
        arrivalTime: serverTimestamp(),
        startTime: null,
        endTime: null,
        totalCost: null,
        paymentMethod: null,
        createdAt: serverTimestamp()
      });

      setMessage("✅ Servicio registrado exitosamente.");
      // Limpiar formulario
      setSearchName("");
      setSelectedPet(null);
      setSelectedOwner(null);
      setShowNewForm(false);
      setOwnerName("");
      setOwnerPhone("");
      setOwnerAddress("");
      setPetName("");
      setPetBreed("");
      setPetNotes("");
    } catch (error) {
      console.error("Error creando servicio:", error);
      setMessage("❌ Error al registrar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info de sucursal */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <p className="text-sm text-indigo-700">
          📍 Sucursal: <strong>{branchName}</strong>
        </p>
      </div>

      {/* Buscar mascota */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Buscar Mascota</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre de la mascota..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {/* Resultados de búsqueda */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Resultados:</h3>
          <div className="space-y-2">
            {searchResults.map((result) => (
              <button
                key={result.pet.id}
                onClick={() => handleSelectPet(result)}
                className="w-full text-left border rounded-md p-3 hover:bg-indigo-50 transition-colors"
              >
                <div className="font-medium">🐕 {result.pet.name}</div>
                <div className="text-sm text-gray-500">
                  {result.pet.type} · {result.pet.breed || "Sin raza"}
                </div>
                {result.owner && (
                  <div className="text-xs text-gray-400 mt-1">
                    Dueño: {result.owner.name} · Tel: {result.owner.phone}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mascota seleccionada */}
      {selectedPet && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800">Mascota seleccionada:</h3>
          <p className="text-sm">🐕 {selectedPet.name} · {selectedPet.type} · {selectedPet.breed || "Sin raza"}</p>
          {selectedOwner && (
            <p className="text-sm text-gray-600">👤 {selectedOwner.name} · 📞 {selectedOwner.phone}</p>
          )}
          <button
            onClick={() => { setSelectedPet(null); setSelectedOwner(null); }}
            className="text-xs text-red-500 mt-1 underline"
          >
            Cambiar mascota
          </button>
        </div>
      )}

      {/* Formulario nueva mascota */}
      {showNewForm && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="text-lg font-semibold">Nueva Mascota y Dueño</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del dueño *</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del dueño *</label>
            <input
              type="tel"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <hr />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la mascota *</label>
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
              <input
                type="text"
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={petNotes}
              onChange={(e) => setPetNotes(e.target.value)}
              rows="2"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Configurar servicio */}
      {(selectedPet || showNewForm) && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="text-lg font-semibold">Detalles del Servicio</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Servicio</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {MODALITIES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateService}
            disabled={saving}
            className="w-full bg-green-600 text-white py-3 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Registrando..." : "✅ Registrar Entrada"}
          </button>
        </div>
      )}

      {/* Mensajes */}
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : message.startsWith("❌") ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
          {message}
        </div>
      )}
    </div>
  );
  }
