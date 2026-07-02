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
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const CATEGORIES = {
  productos: {
    label: "Productos",
    subcategories: ["Alimentos", "Accesorios", "Juguetes", "Higiene", "Medicamentos"]
  },
  insumos_bano: {
    label: "Insumos Baño",
    subcategories: ["Shampoo", "Acondicionador", "Perfume", "Algodón"]
  },
  insumos_mvz: {
    label: "Insumos MVZ",
    subcategories: ["Vacunas", "Agujas", "Vendajes", "Medicamentos"]
  }
};

const UNITS = [
  { id: "pz", label: "Pieza (pz)" },
  { id: "kg", label: "Kilogramo (kg)" },
  { id: "L", label: "Litro (L)" },
  { id: "mL", label: "Mililitro (mL)" }
];

export default function Inventory() {
  const { userData } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";
  const isAdmin = userData?.role === "admin";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Formulario
  const [name, setName] = useState("");
  const [category, setCategory] = useState("productos");
  const [subcategory, setSubcategory] = useState("Alimentos");
  const [type, setType] = useState("producto");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [unit, setUnit] = useState("pz");
  const [saving, setSaving] = useState(false);

  // Cargar productos
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [branchId]);

  // Abrir formulario para crear
  const handleCreate = () => {
    setEditingProduct(null);
    setName("");
    setCategory("productos");
    setSubcategory("Alimentos");
    setType("producto");
    setPrice("");
    setCost("");
    setStock("");
    setMinStock("5");
    setUnit("pz");
    setShowForm(true);
  };

  // Abrir formulario para editar
  const handleEdit = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setSubcategory(product.subcategory);
    setType(product.type);
    setPrice(product.price || "");
    setCost(product.cost || "");
    setStock(product.stock);
    setMinStock(product.minStock || "5");
    setUnit(product.unit);
    setShowForm(true);
  };

  // Guardar producto
  const handleSave = async () => {
    if (!name.trim() || !stock || stock < 0) {
      alert("Completa nombre y stock");
      return;
    }

    setSaving(true);

    try {
      const productData = {
        name: name.trim(),
        category,
        subcategory,
        type,
        price: type === "producto" ? parseFloat(price) || 0 : 0,
        cost: parseFloat(cost) || 0,
        stock: parseInt(stock),
        minStock: parseInt(minStock) || 5,
        unit,
        branchId,
        active: true,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData);
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, "products"), productData);
      }

      setShowForm(false);
    } catch (error) {
      console.error("Error guardando producto:", error);
      alert("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar producto
  const handleDelete = async (productId) => {
    if (!confirm("¿Eliminar este producto?")) return;

    try {
      await updateDoc(doc(db, "products", productId), {
        active: false
      });
    } catch (error) {
      console.error("Error eliminando:", error);
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter((p) => {
    if (!p.active) return false;
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Alertas de stock bajo
  const lowStockProducts = filteredProducts.filter((p) => p.stock <= p.minStock);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando inventario...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alertas de stock bajo */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Stock bajo ({lowStockProducts.length})</h3>
          <div className="space-y-1">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="text-sm text-red-700">
                {p.name}: {p.stock} {p.unit} (mínimo: {p.minStock})
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <div className="text-xs text-red-600">
                Y {lowStockProducts.length - 5} más...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 text-sm"
          />
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              ➕ Nuevo
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
              filterCategory === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Todos
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                filterCategory === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay productos</div>
        ) : (
          <div className="divide-y">
            {filteredProducts.map((product) => (
              <div key={product.id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    {product.stock <= product.minStock && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Stock bajo</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {CATEGORIES[product.category]?.label} · {product.subcategory} · {product.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {product.stock} {product.unit}
                  </div>
                  {product.type === "producto" && (
                    <div className="text-xs text-gray-500">${product.price}</div>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold">
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="producto">Producto (venta)</option>
                  <option value="insumo">Insumo (interno)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory(CATEGORIES[e.target.value].subcategories[0]);
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {CATEGORIES[category].subcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {type === "producto" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setShowForm(false)}
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
