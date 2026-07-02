import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
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

  // Modo de búsqueda
  const [searchMode, setSearchMode] = useState("pet");

  // Búsqueda por mascota
  const [searchPetName, setSearchPetName] = useState("");
  const [petResults, setPetResults] = useState([]);
  const [searchingPet, setSearchingPet] = useState(false);

  // Búsqueda por dueño
  const [searchOwnerName, setSearchOwnerName] = useState("");
  const [ownerResults, setOwnerResults] = useState([]);
  const [searchingOwner, setSearchingOwner] = useState(false);

  // Mascota/dueño seleccionado
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Formulario nueva mascota (para dueño existente)
  const [showNewPetForm, setShowNewPetForm] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetType, setNewPetType] = useState("perro");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetNotes, setNewPetNotes] = useState("");

  // Formulario nuevo dueño + mascota
  const [showNewOwnerForm, setShowNewOwnerForm] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("perro");
  const [petBreed, setPetBreed] = useState("");
  const [petNotes, setPetNotes] = useState("");

  // Historia clínica
  const [showClinicalForm, setShowClinicalForm] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("macho");
  const [sterilized, setSterilized] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [preexistingConditions, setPreexistingConditions] = useState("");

  // Servicio
  const [serviceType, setServiceType] = useState("bano");
  const [modality, setModality] = useState("sucursal");

  // Estado
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Buscar mascota por nombre
  const handleSearchPet = async () => {
    if (!searchPetName.trim()) return;
    setSearchingPet(true);
    setPetResults([]);
    setSelectedPet(null);
    setSelectedOwner(null);
    setShowNewOwnerForm(false);
    setShowNewPetForm(false);
    setShowClinicalForm(false);

    try {
      const petsRef = collection(db, "pets");
      const q = query(
        petsRef,
        where("nameLower", ">=", searchPetName.toLowerCase()),
        where("nameLower", "<=", searchPetName.toLowerCase() + "\uf8ff")
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("No se encontró ninguna mascota con ese nombre.");
        setShowNewOwnerForm(true);
        setPetName(searchPetName);
      } else {
        const results = [];
        for (const petDoc of snapshot.docs) {
          const pet = { id: petDoc.id, ...petDoc.data() };
          const ownerDoc = await getDocs(
            query(collection(db, "owners"), where("__name__", "==", pet.ownerId))
          );
          const owner = ownerDoc.empty
            ? null
            : { id: ownerDoc.docs[0].id, ...ownerDoc.docs[0].data() };
          results.push({ pet, owner });
        }
        setPetResults(results);
        setMessage("");
      }
    } catch (error) {
      console.error("Error buscando mascota:", error);
      setMessage("Error al buscar. Intenta de nuevo.");
    } finally {
      setSearchingPet(false);
    }
  };

  // Buscar dueño por nombre
  const handleSearchOwner = async () => {
    if (!searchOwnerName.trim()) return;
    setSearchingOwner(true);
    setOwnerResults([]);
    setSelectedPet(null);
    setSelectedOwner(null);
    setShowNewOwnerForm(false);
    setShowNewPetForm(false);
    setShowClinicalForm(false);

    try {
      const ownersRef = collection(db, "owners");
      const q = query(
        ownersRef,
        where("nameLower", ">=", searchOwnerName.toLowerCase()),
        where("nameLower", "<=", searchOwnerName.toLowerCase() + "\uf8ff")
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("No se encontró ningún dueño con ese nombre.");
        setShowNewOwnerForm(true);
        setOwnerName(searchOwnerName);
      } else {
        const results = [];
        for (const ownerDoc of snapshot.docs) {
          const owner = { id: ownerDoc.id, ...ownerDoc.data() };
          const petsSnapshot = await getDocs(
            query(collection(db, "pets"), where("ownerId", "==", owner.id))
          );
          const pets = petsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          results.push({ owner, pets });
        }
        setOwnerResults(results);
        setMessage("");
      }
    } catch (error) {
      console.error("Error buscando dueño:", error);
      setMessage("Error al buscar. Intenta de nuevo.");
    } finally {
      setSearchingOwner(false);
    }
  };

  // Seleccionar mascota de resultados
  const handleSelectPet = (result) => {
    setSelectedPet(result.pet);
    setSelectedOwner(result.owner);
    setPetResults([]);
    setShowNewOwnerForm(false);
    setShowNewPetForm(false);
    setMessage("");

    if (!result.pet.weight && !result.pet.birthDate) {
      setShowClinicalForm(true);
    }
  };

  // Seleccionar dueño
  const handleSelectOwner = (result) => {
    setSelectedOwner(result.owner);
    setSelectedPet(null);
    setOwnerResults([]);
    setShowNewOwnerForm(false);
    setShowNewPetForm(true);
    setShowClinicalForm(false);
    setMessage("");
  };

  // Seleccionar mascota existente del dueño
  const handleSelectExistingPet = (pet) => {
    setSelectedPet(pet);
    setShowNewPetForm(false);
    setMessage("");

    if (!pet.weight && !pet.birthDate) {
      setShowClinicalForm(true);
    }
  };

  // Guardar historia clínica
  const handleSaveClinical = async () => {
    if (!selectedPet) return;

    try {
      await updateDoc(doc(db, "pets", selectedPet.id), {
        birthDate: birthDate ? new Date(birthDate) : null,
        weight: weight ? parseFloat(weight) : null,
        sex,
        sterilized,
        allergies: allergies.trim(),
        preexistingConditions: preexistingConditions.trim(),
        updatedAt: serverTimestamp()
      });

      setSelectedPet({
        ...selectedPet,
        birthDate,
        weight,
        sex,
        sterilized,
        allergies,
        preexistingConditions
      });

      setShowClinicalForm(false);
      setMessage("✅ Historia clínica guardada");
    } catch (error) {
      console.error("Error guardando historia clínica:", error);
      setMessage("❌ Error al guardar historia clínica");
    }
  };

  // Registrar servicio
  const handleCreateService = async () => {
    setSaving(true);
    setMessage("");

    try {
      let finalPetId = selectedPet?.id;
      let finalOwnerId = selectedOwner?.id;

      // Si es nuevo dueño + nueva mascota
      if (showNewOwnerForm && !selectedOwner) {
        if (!ownerName.trim() || !ownerPhone.trim() || !petName.trim()) {
          setMessage("Completa nombre del dueño, teléfono y nombre de la mascota.");
          setSaving(false);
          return;
        }

        const ownerRef = await addDoc(collection(db, "owners"), {
          name: ownerName.trim(),
          nameLower: ownerName.trim().toLowerCase(),
          phone: ownerPhone.trim(),
          address: ownerAddress.trim(),
          createdAt: serverTimestamp()
        });
        finalOwnerId = ownerRef.id;

        const petData = {
          ownerId: finalOwnerId,
          name: petName.trim(),
          nameLower: petName.trim().toLowerCase(),
          type: petType,
          breed: petBreed.trim(),
          notes: petNotes.trim(),
          createdAt: serverTimestamp()
        };

        if (showClinicalForm) {
          petData.birthDate = birthDate ? new Date(birthDate) : null;
          petData.weight = weight ? parseFloat(weight) : null;
          petData.sex = sex;
          petData.sterilized = sterilized;
          petData.allergies = allergies.trim();
          petData.preexistingConditions = preexistingConditions.trim();
        }

        const petRef = await addDoc(collection(db, "pets"), petData);
        finalPetId = petRef.id;
      }

      // Si es dueño existente + nueva mascota
      if (showNewPetForm && selectedOwner && !selectedPet) {
        if (!newPetName.trim()) {
          setMessage("Completa el nombre de la mascota.");
          setSaving(false);
          return;
        }

        const petData = {
          ownerId: selectedOwner.id,
          name: newPetName.trim(),
          nameLower: newPetName.trim().toLowerCase(),
          type: newPetType,
          breed: newPetBreed.trim(),
          notes: newPetNotes.trim(),
          createdAt: serverTimestamp()
        };

        if (showClinicalForm) {
          petData.birthDate = birthDate ? new Date(birthDate) : null;
          petData.weight = weight ? parseFloat(weight) : null;
          petData.sex = sex;
          petData.sterilized = sterilized;
          petData.allergies = allergies.trim();
          petData.preexistingConditions = preexistingConditions.trim();
        }

        const petRef = await addDoc(collection(db, "pets"), petData);
        finalPetId = petRef.id;
      }

      // Crear servicio
      await addDoc(collection(db, "services"), {
        petId: finalPetId,
        petName: selectedPet?.name || petName.trim() || newPetName.trim(),
        ownerName: selectedOwner?.name || ownerName.trim(),
        ownerPhone: selectedOwner?.phone || ownerPhone.trim(),
        branchId: branchId,
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
      
      // Limpiar todo
      setSearchPetName("");
      setSearchOwnerName("");
      setSelectedPet(null);
      setSelectedOwner(null);
      setPetResults([]);
      setOwnerResults([]);
      setShowNewOwnerForm(false);
      setShowNewPetForm(false);
      setShowClinicalForm(false);
      setOwnerName("");
      setOwnerPhone("");
      setOwnerAddress("");
      setPetName("");
      setPetBreed("");
      setPetNotes("");
      setNewPetName("");
      setNewPetBreed("");
      setNewPetNotes("");
      setBirthDate("");
      setWeight("");
      setSex("macho");
      setSterilized(false);
      setAllergies("");
      setPreexistingConditions("");
    } catch (error) {
      console.error("Error creando servicio:", error);
      setMessage("❌ Error al registrar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (<div className="space-y-6">
      {/* Info de sucursal */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <p className="text-sm text-indigo-700">
          📍 Sucursal: <strong>{branchName}</strong>
        </p>
      </div>

      {/* Selector de modo de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Buscar</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setSearchMode("pet");
              setOwnerResults([]);
              setShowNewPetForm(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              searchMode === "pet"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🐾 Por Mascota
          </button>
          <button
            onClick={() => {
              setSearchMode("owner");
              setPetResults([]);
              setShowNewOwnerForm(false);
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              searchMode === "owner"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            👤 Por Dueño
          </button>
        </div>

        {searchMode === "pet" && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la mascota..."
              value={searchPetName}
              onChange={(e) => setSearchPetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchPet()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleSearchPet}
              disabled={searchingPet}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {searchingPet ? "Buscando..." : "Buscar"}
            </button>
          </div>
        )}

        {searchMode === "owner" && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del dueño..."
              value={searchOwnerName}
              onChange={(e) => setSearchOwnerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchOwner()}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={handleSearchOwner}
              disabled={searchingOwner}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {searchingOwner ? "Buscando..." : "Buscar"}
            </button>
          </div>
        )}
      </div>

      {/* Resultados de búsqueda por mascota */}
      {petResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Mascotas encontradas:</h3>
          <div className="space-y-2">
            {petResults.map((result) => (
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

      {/* Resultados de búsqueda por dueño */}
      {ownerResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Dueños encontrados:</h3>
          <div className="space-y-3">
            {ownerResults.map((result) => (
              <div key={result.owner.id} className="border rounded-md p-3">
                <div className="font-medium mb-2">👤 {result.owner.name}</div>
                <div className="text-sm text-gray-500 mb-2">
                  📞 {result.owner.phone}
                  {result.owner.address && ` · 📍 ${result.owner.address}`}
                </div>
                {result.pets.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600 font-semibold">Mascotas:</div>
                    {result.pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => handleSelectExistingPet(pet)}
                        className="w-full text-left bg-gray-50 hover:bg-indigo-50 rounded px-2 py-1 text-sm transition-colors"
                      >
                        🐕 {pet.name} · {pet.type} · {pet.breed || "Sin raza"}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleSelectOwner(result)}
                  className="mt-2 w-full bg-indigo-600 text-white py-1.5 rounded-md text-sm hover:bg-indigo-700"
                >
                  ➕ Agregar nueva mascota a este dueño
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mascota seleccionada */}
      {selectedPet && selectedOwner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800">Mascota seleccionada:</h3>
          <p className="text-sm">🐕 {selectedPet.name} · {selectedPet.type} · {selectedPet.breed || "Sin raza"}</p>
          <p className="text-sm text-gray-600">👤 {selectedOwner.name} · 📞 {selectedOwner.phone}</p>
          {selectedPet.weight && (
            <p className="text-xs text-gray-500 mt-1">⚖️ {selectedPet.weight} kg</p>
          )}
          <button
            onClick={() => {
              setSelectedPet(null);
              setSelectedOwner(null);
            }}
            className="text-xs text-red-500 mt-1 underline"
          >
            Cambiar selección
          </button>
        </div>
      )}

      {/* Formulario historia clínica */}
      {showClinicalForm && selectedPet && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold text-blue-800">📋 Historia Clínica</h3>
          <p className="text-xs text-blue-600">Completa los datos clínicos de la mascota</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sterilized}
                  onChange={(e) => setSterilized(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Esterilizado/a</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              rows="2"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Ej: Alérgico al pollo..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones preexistentes</label>
            <textarea
              value={preexistingConditions}
              onChange={(e) => setPreexistingConditions(e.target.value)}
              rows="2"
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Ej: Problemas de piel..."
            />
          </div>

          <button
            onClick={handleSaveClinical}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm hover:bg-blue-700"
          >
            💾 Guardar Historia Clínica
          </button>
        </div>
      )}

      {/* Formulario nueva mascota para dueño existente */}
      {showNewPetForm && selectedOwner && !selectedPet && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            <p className="text-sm text-blue-700">
              👤 Dueño: <strong>{selectedOwner.name}</strong> · 📞 {selectedOwner.phone}
            </p>
          </div>

          <h3 className="text-lg font-semibold">Nueva Mascota</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la mascota *</label>
            <input
              type="text"
              value={newPetName}
              onChange={(e) => setNewPetName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={newPetType}
                onChange={(e) => setNewPetType(e.target.value)}
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
                value={newPetBreed}
                onChange={(e) => setNewPetBreed(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={newPetNotes}
              onChange={(e) => setNewPetNotes(e.target.value)}
              rows="2"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => setShowClinicalForm(true)}
            className="text-xs text-blue-600 underline"
          >
            📋 Agregar historia clínica
          </button>

          <button
            onClick={() => {
              setShowNewPetForm(false);
              setSelectedOwner(null);
            }}
            className="text-xs text-red-500 underline block mt-2"
          >
            Cancelar y cambiar dueño
          </button>
        </div>
      )}

      {/* Formulario nuevo dueño + mascota */}
      {showNewOwnerForm && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="text-lg font-semibold">Nuevo Dueño y Mascota</h3>

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

          <button
            onClick={() => setShowClinicalForm(true)}
            className="text-xs text-blue-600 underline"
          >
            📋 Agregar historia clínica
          </button>
        </div>
      )}

      {/* Configurar servicio */}
      {(selectedPet || showNewPetForm || showNewOwnerForm) && (
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
        <div
          className={`p-3 rounded-md text-sm ${
            message.startsWith("✅")
              ? "bg-green-50 text-green-700"
              : message.startsWith("❌")
              ? "bg-red-50 text-red-700"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
                }
