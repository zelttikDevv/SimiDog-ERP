import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";

export default function MedicalHistory() {
  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState(null);
  const [editing, setEditing] = useState(false);

  // Datos editables
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState("macho");
  const [sterilized, setSterilized] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [preexistingConditions, setPreexistingConditions] = useState("");
  const [vaccinesUpToDate, setVaccinesUpToDate] = useState(false);
  const [lastVaccineDate, setLastVaccineDate] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [behavior, setBehavior] = useState("");

  useEffect(() => {
    const loadPets = async () => {
      const petsSnapshot = await getDocs(collection(db, "pets"));
      const petsData = petsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const ownersSnapshot = await getDocs(collection(db, "owners"));
      const ownersData = ownersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setPets(petsData);
      setOwners(ownersData);
      setLoading(false);
    };
    loadPets();
  }, []);

  const filteredPets = pets.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPet = (pet) => {
    setSelectedPet(pet);
    setEditing(false);
    setBirthDate(pet.birthDate ? new Date(pet.birthDate.toDate ? pet.birthDate.toDate() : pet.birthDate).toISOString().split("T")[0] : "");
    setWeight(pet.weight || "");
    setSex(pet.sex || "macho");
    setSterilized(pet.sterilized || false);
    setAllergies(pet.allergies || "");
    setPreexistingConditions(pet.preexistingConditions || "");
    setVaccinesUpToDate(pet.vaccinesUpToDate || false);
    setLastVaccineDate(pet.lastVaccineDate ? new Date(pet.lastVaccineDate.toDate ? pet.lastVaccineDate.toDate() : pet.lastVaccineDate).toISOString().split("T")[0] : "");
    setMicrochip(pet.microchip || "");
    setBehavior(pet.behavior || "");
  };

  const handleSave = async () => {
    if (!selectedPet) return;

    try {
      await updateDoc(doc(db, "pets", selectedPet.id), {
        birthDate: birthDate ? new Date(birthDate) : null,
        weight: weight ? parseFloat(weight) : null,
        sex,
        sterilized,
        allergies,
        preexistingConditions,
        vaccinesUpToDate,
        lastVaccineDate: lastVaccineDate ? new Date(lastVaccineDate) : null,
        microchip,
        behavior,
        updatedAt: new Date()
      });

      setEditing(false);
      alert("✅ Historia clínica actualizada");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al actualizar");
    }
  };

  const getOwnerName = (ownerId) => {
    const owner = owners.find((o) => o.id === ownerId);
    return owner?.name || "Desconocido";
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="🔍 Buscar mascota por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {selectedPet ? (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">🐾 {selectedPet.name}</h2>
              <p className="text-sm text-gray-500">
                👤 {getOwnerName(selectedPet.ownerId)} · {selectedPet.type} · {selectedPet.breed || "Sin raza"}
              </p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
              >
                ✏️ Editar
              </button>
            )}
          </div>

          {/* Datos básicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Peso</div>
              {editing ? (
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="font-semibold">{weight ? `${weight} kg` : "Sin registro"}</div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Sexo</div>
              {editing ? (
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="macho">Macho</option>
                  <option value="hembra">Hembra</option>
                </select>
              ) : (
                <div className="font-semibold capitalize">{sex || "Sin registro"}</div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Fecha de nacimiento</div>
              {editing ? (
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              ) : (
                <div className="font-semibold">{birthDate || "Sin registro"}</div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">Microchip</div>
              {editing ? (
                <input
                  type="text"
                  value={microchip}
                  onChange={(e) => setMicrochip(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="Número de microchip"
                />
              ) : (
                <div className="font-semibold">{microchip || "Sin registro"}</div>
              )}
            </div>
          </div>

          {/* Esterilización y vacunas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500 mb-1">Esterilizado/a</div>
              {editing ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sterilized}
                    onChange={(e) => setSterilized(e.target.checked)}
                  />
                  <span className="text-sm">Sí</span>
                </label>
              ) : (
                <div className="font-semibold">{sterilized ? "Sí" : "No"}</div>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500 mb-1">Vacunas al día</div>
              {editing ? (
                <div>
                  <label className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={vaccinesUpToDate}
                      onChange={(e) => setVaccinesUpToDate(e.target.checked)}
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <input
                    type="date"
                    value={lastVaccineDate}
                    onChange={(e) => setLastVaccineDate(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Última vacuna"
                  />
                </div>
              ) : (
                <div>
                  <div className="font-semibold">{vaccinesUpToDate ? "Sí" : "No"}</div>
                  {lastVaccineDate && (
                    <div className="text-xs text-gray-500">Última: {lastVaccineDate}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Alergias */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
            {editing ? (
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Alergias conocidas..."
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm">
                {allergies || "Sin alergias registradas"}
              </div>
            )}
          </div>

          {/* Condiciones preexistentes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones preexistentes</label>
            {editing ? (
              <textarea
                value={preexistingConditions}
                onChange={(e) => setPreexistingConditions(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Condiciones médicas..."
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm">
                {preexistingConditions || "Sin condiciones registradas"}
              </div>
            )}
          </div>

          {/* Comportamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comportamiento</label>
            {editing ? (
              <textarea
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
                rows="2"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Agresivo, tímido, sociable..."
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm">
                {behavior || "Sin registro"}
              </div>
            )}
          </div>

          {editing && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700"
              >
                💾 Guardar cambios
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Cancelar
              </button>
            </div>
          )}

          <button
            onClick={() => setSelectedPet(null)}
            className="text-sm text-gray-500 underline"
          >
            ← Volver a la lista
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {filteredPets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No se encontraron mascotas</div>
          ) : (
            <div className="divide-y">
              {filteredPets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handleSelectPet(pet)}
                  className="w-full text-left p-4 hover:bg-indigo-50 transition-colors"
                >
                  <div className="font-medium">🐾 {pet.name}</div>
                  <div className="text-sm text-gray-500">
                    {pet.type} · {pet.breed || "Sin raza"} ·  {getOwnerName(pet.ownerId)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
                              }
