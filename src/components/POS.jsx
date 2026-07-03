import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { generateTicketPDF } from "../lib/pdfGenerator";

const PAYMENT_METHODS = [
  { id: "efectivo", label: "💵 Efectivo" },
  { id: "tarjeta", label: "💳 Tarjeta" },
  { id: "transferencia", label: "📱 Transferencia" }
];

export default function POS() {
  const { userData, currentUser } = useAuth();
  const branchId = userData?.branchId || "sucursal-11av";

  const [products, setProducts] = useState([]);
  const [medicalServices, setMedicalServices] = useState([]);
  const [bathServices, setBathServices] = useState([]);
  const [currentRegister, setCurrentRegister] = useState(null);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [items, setItems] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [servicePrice, setServicePrice] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceType, setServiceType] = useState("bath");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [payments, setPayments] = useState([{ method: "efectivo", amount: "" }]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  // Cargar productos
  useEffect(() => {
    const q = query(collection(db, "products"), where("branchId", "==", branchId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p) => p.active !== false && p.type === "producto" && p.stock > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [branchId]);

  // Cargar servicios médicos del catálogo
  useEffect(() => {
    const q = query(collection(db, "medical_services"), where("branchId", "==", branchId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      setMedicalServices(data);
    });
    return unsubscribe;
  }, [branchId]);

  // Cargar servicios de baño del catálogo
  useEffect(() => {
    const q = query(collection(db, "bath_services"), where("branchId", "==", branchId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      setBathServices(data);
    });
    return unsubscribe;
  }, [branchId]);

  // Cargar caja abierta
  useEffect(() => {
    const q = query(
      collection(db, "cash_registers"),
      where("branchId", "==", branchId),
      where("status", "==", "abierta")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCurrentRegister({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCurrentRegister(null);
      }
    });
    return unsubscribe;
  }, [branchId]);

  // Cargar citas atendidas pendientes de cobro
  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("branchId", "==", branchId),
      where("status", "==", "atendida")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.attendedAt?.toMillis?.() || 0;
          const bTime = b.attendedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      setPendingAppointments(data);
    });
    return unsubscribe;
  }, [branchId]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMedicalServices = medicalServices.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBathServices = bathServices.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discount = appliedCoupon
    ? appliedCoupon.discountType === "percent"
      ? subtotal * (appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const change = Math.max(0, totalPaid - total);
  const isPaymentComplete = totalPaid >= total && total > 0;

  const handleAddProduct = (product) => {
    const existing = items.find((i) => i.type === "product" && i.id === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.stock) {
        setMessage("❌ Stock insuficiente");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      setItems(items.map((i) =>
        i.type === "product" && i.id === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      ));
    } else {
      setItems([...items, {
        type: "product",
        id: product.id,
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        maxStock: product.stock
      }]);
    }
    setSearchTerm("");
  };

  const handleOpenServiceForm = (service, type) => {
    setSelectedService(service);
    setServicePrice(service.defaultPrice);
    setServiceNotes("");
    setServiceType(type);
    setShowServiceForm(true);
  };

  const handleAddService = () => {
    if (!selectedService) return;
    const price = parseFloat(servicePrice) || selectedService.defaultPrice;
    setItems([...items, {
      type: serviceType,
      id: `${serviceType}_${Date.now()}`,
      serviceId: selectedService.id,
      name: selectedService.name,
      notes: serviceNotes,
      quantity: 1,
      unitPrice: price,
      total: price
    }]);
    setSelectedService(null);
    setServicePrice("");
    setServiceNotes("");
    setShowServiceForm(false);
  };

  const handleAddAppointment = (appointment) => {
    const newItems = appointment.procedures.map((proc) => ({
      type: "mvz",
      id: `apt_${appointment.id}_${proc.id}`,
      appointmentId: appointment.id,
      petId: appointment.petId,
      petName: appointment.petName,
      ownerId: appointment.ownerId,
      ownerName: appointment.ownerName,
      ownerPhone: appointment.ownerPhone,
      serviceId: proc.id,
      name: proc.name,
      notes: "",
      quantity: 1,
      unitPrice: proc.cost,
      total: proc.cost
    }));

    setItems([...items, ...newItems]);
    setMessage(`✅ Cita de ${appointment.petName} agregada (${newItems.length} procedimientos)`);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleUpdateQuantity = (index, quantity) => {
    const newItems = [...items];
    const qty = parseInt(quantity) || 1;
    const max = newItems[index].maxStock || 999;
    newItems[index].quantity = Math.min(qty, max);
    newItems[index].total = newItems[index].unitPrice * newItems[index].quantity;
    setItems(newItems);
  };

  const handleUpdatePrice = (index, price) => {
    const newItems = [...items];
    newItems[index].unitPrice = parseFloat(price) || 0;
    newItems[index].total = newItems[index].unitPrice * newItems[index].quantity;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    setAppliedCoupon(null);
    if (!couponCode.trim()) return;
    try {
      const q = query(collection(db, "coupons"), where("code", "==", couponCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setCouponError("❌ Cupón no encontrado");
        return;
      }
      const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      if (coupon.used) {
        setCouponError(" Este cupón ya fue usado");
        return;
      }
      if (coupon.expiresAt) {
        const expDate = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
        if (expDate < new Date()) {
          setCouponError("❌ Este cupón ha expirado");
          return;
        }
      }
      setAppliedCoupon(coupon);
      setCouponCode("");
    } catch (error) {
      console.error("Error validando cupón:", error);
      setCouponError("❌ Error al validar el cupón");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleAddPayment = () => {
    setPayments([...payments, { method: "efectivo", amount: "" }]);
  };

  const handleUpdatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const handleRemovePayment = (index) => {
    if (payments.length === 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };const handleProcessSale = async () => {
    if (!currentRegister) {
      setMessage("❌ Debes abrir la caja antes de cobrar. Ve a la pestaña 'Caja' para abrirla.");
      setTimeout(() => setMessage(""), 5000);
      return;
    }
    if (!isPaymentComplete) {
      setMessage("❌ El pago está incompleto");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (items.length === 0) {
      setMessage("❌ No hay items en el ticket");
      return;
    }
    setProcessing(true);
    setMessage("");
    try {
      const itemWithOwner = items.find((i) => i.ownerId);
      
      const transactionData = {
        branchId,
        userId: currentUser?.uid,
        userName: userData?.email || "Desconocido",
        cashRegisterId: currentRegister.id,
        petId: itemWithOwner?.petId || null,
        petName: itemWithOwner?.petName || null,
        ownerId: itemWithOwner?.ownerId || null,
        ownerName: itemWithOwner?.ownerName || null,
        ownerPhone: itemWithOwner?.ownerPhone || null,
        items: items.map((i) => ({
          type: i.type,
          id: i.id,
          name: i.name,
          notes: i.notes || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total
        })),
        subtotal,
        discount,
        discountReason: appliedCoupon ? `Cupón: ${appliedCoupon.code}` : null,
        total,
        payments: payments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0
        })),
        change,
        couponId: appliedCoupon?.id || null,
        couponCode: appliedCoupon?.code || null,
        status: "completado",
        timestamp: serverTimestamp()
      };
      const txRef = await addDoc(collection(db, "transactions"), transactionData);
      const transaction = { id: txRef.id, ...transactionData, timestamp: new Date() };

      // Crear registros de servicios MVZ sueltos (no de citas)
      for (const item of items) {
        if (item.type === "mvz" && !item.appointmentId) {
          await addDoc(collection(db, "vet_services"), {
            branchId,
            petId: item.petId || null,
            petName: item.petName || item.name,
            ownerName: item.ownerName || null,
            ownerPhone: item.ownerPhone || null,
            serviceName: item.name,
            serviceId: item.serviceId,
            cost: item.total,
            status: "facturado",
            notes: item.notes || null,
            registeredBy: currentUser?.uid,
            registeredByEmail: userData?.email,
            transactionId: txRef.id,
            timestamp: serverTimestamp()
          });
        }
      }

      // Marcar citas como cobradas
      const appointmentIds = [...new Set(items.filter((i) => i.appointmentId).map((i) => i.appointmentId))];
      for (const aptId of appointmentIds) {
        await updateDoc(doc(db, "appointments", aptId), {
          status: "cobrada",
          transactionId: txRef.id,
          totalCost: total,
          paidAt: serverTimestamp()
        });
      }

      // Actualizar historia clínica de la mascota
      if (itemWithOwner?.petId) {
        const petRef = doc(db, "pets", itemWithOwner.petId);
        const petSnap = await getDocs(query(collection(db, "pets"), where("__name__", "==", itemWithOwner.petId)));
        
        if (!petSnap.empty) {
          const petData = petSnap.docs[0].data();
          const clinicalHistory = petData.clinicalHistory || [];
          
          // Agregar nueva entrada al historial
          const newHistoryEntry = {
            date: serverTimestamp(),
            transactionId: txRef.id,
            mvzName: itemWithOwner.ownerName || "N/A",
            procedures: items
              .filter((i) => i.type === "mvz")
              .map((i) => ({ name: i.name, cost: i.total })),
            services: items
              .filter((i) => i.type === "bath")
              .map((i) => ({ name: i.name, cost: i.total })),
            products: items
              .filter((i) => i.type === "product")
              .map((i) => ({ name: i.name, quantity: i.quantity, total: i.total })),
            totalCost: total,
            notes: items.find((i) => i.notes)?.notes || ""
          };
          
          clinicalHistory.push(newHistoryEntry);
          
          await updateDoc(petRef, {
            clinicalHistory,
            updatedAt: serverTimestamp()
          });
        }
      }

      if (appliedCoupon) {
        await updateDoc(doc(db, "coupons", appliedCoupon.id), {
          used: true,
          usedAt: serverTimestamp(),
          transactionId: txRef.id
        });
      }
      
      for (const item of items) {
        if (item.type === "product") {
          const productRef = doc(db, "products", item.productId);
          await updateDoc(productRef, {
            stock: item.maxStock - item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      setMessage("✅ Venta procesada correctamente");
      setTimeout(() => {
        generateTicketPDF(transaction);
      }, 500);
      setItems([]);
      setAppliedCoupon(null);
      setCouponCode("");
      setPayments([{ method: "efectivo", amount: "" }]);
      setSearchTerm("");
    } catch (error) {
      console.error("Error procesando venta:", error);
      setMessage("❌ Error al procesar la venta");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando POS...</div>;
  }

  return (<div className="space-y-4">
      {!currentRegister && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">Caja cerrada</p>
              <p className="text-sm text-yellow-700">
                Debes abrir la caja antes de poder cobrar. Ve a la pestaña "Caja" para abrirla.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* Citas atendidas pendientes de cobro */}
      {pendingAppointments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">🩺 Citas Atendidas - Pendientes de Cobro</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingAppointments.map((apt) => {
              const totalApt = apt.procedures?.reduce((sum, p) => sum + p.cost, 0) || 0;
              return (
                <div key={apt.id} className="border rounded-lg p-3 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">🐾 {apt.petName}</div>
                    <div className="text-xs text-gray-500">
                      👤 {apt.ownerName} · 📞 {apt.ownerPhone}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {apt.procedures?.map((p) => p.name).join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">${totalApt.toFixed(2)}</div>
                    <button
                      onClick={() => handleAddAppointment(apt)}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded mt-1 hover:bg-green-700"
                    >
                      + Agregar al ticket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "products" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🛍️ Productos
            </button>
            <button
              onClick={() => setActiveTab("bath")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "bath" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🛁 Baño/Corte
            </button>
            <button
              onClick={() => setActiveTab("mvz")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "mvz" ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              🏥 MVZ
            </button>
          </div>

          {activeTab === "products" && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="text-left border-2 border-gray-200 rounded-lg p-3 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">Stock: {product.stock} {product.unit}</span>
                        <span className="font-bold text-indigo-600">${product.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "bath" && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Buscar servicio de baño..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              {!showServiceForm ? (
                <>
                  {filteredBathServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay servicios de baño disponibles. El admin debe crearlos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredBathServices.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => handleOpenServiceForm(service, "bath")}
                          className="text-left border-2 border-gray-200 rounded-lg p-3 hover:border-purple-500 hover:bg-purple-50 transition-all"
                        >
                          <div className="font-medium text-sm">{service.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {service.serviceType} · {service.size} · ⏱️ {service.duration} min
                          </div>
                          <div className="font-bold text-purple-600 mt-1">${service.defaultPrice}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold">Editar Servicio de Baño/Corte</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                    <div className="bg-gray-100 rounded-md px-3 py-2 text-sm">
                      {selectedService?.name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                    <textarea
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      rows="2"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Observaciones del servicio..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddService}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-md text-sm hover:bg-purple-700"
                    >
                      ✅ Agregar al ticket
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceForm(false);
                        setSelectedService(null);
                        setServicePrice("");
                        setServiceNotes("");
                      }}
                      className="px-4 py-2 border rounded-md text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "mvz" && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder=" Buscar servicio médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-green-500 focus:outline-none"
                />
              </div>
              {!showServiceForm ? (
                <>
                  {filteredMedicalServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay servicios médicos disponibles. El admin debe crearlos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMedicalServices.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => handleOpenServiceForm(service, "mvz")}
                          className="text-left border-2 border-gray-200 rounded-lg p-3 hover:border-green-500 hover:bg-green-50 transition-all"
                        >
                          <div className="font-medium text-sm">{service.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {service.category} · ️ {service.duration} min
                          </div>
                          <div className="font-bold text-green-600 mt-1">${service.defaultPrice}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold">Editar Servicio MVZ</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                    <div className="bg-gray-100 rounded-md px-3 py-2 text-sm">
                      {selectedService?.name}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas clínicas (opcional)</label>
                    <textarea
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      rows="2"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Diagnóstico, tratamiento, etc."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddService}
                      className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm hover:bg-green-700"
                    >
                      ✅ Agregar al ticket
                    </button>
                    <button
                      onClick={() => {
                        setShowServiceForm(false);
                        setSelectedService(null);
                        setServicePrice("");
                        setServiceNotes("");
                      }}
                      className="px-4 py-2 border rounded-md text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div><div className="bg-white rounded-lg shadow p-4 h-fit sticky top-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            🧾 Ticket
            {items.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {items.length} items
              </span>
            )}
          </h3>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Agrega productos o servicios al ticket
            </div>
          ) : (
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.type === "product" ? "🛍️ Producto" : item.type === "bath" ? "🛁 Baño/Corte" : "🏥 Servicio MVZ"}
                        {item.notes && <div className="italic mt-1">{item.notes}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    {item.type === "product" ? (
                      <>
                        <span className="text-xs text-gray-600">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          max={item.maxStock}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                          className="w-16 border rounded px-2 py-1 text-sm text-center"
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-600">Precio:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdatePrice(index, e.target.value)}
                          className="flex-1 border rounded px-2 py-1 text-sm"
                        />
                      </>
                    )}
                    <div className="text-sm font-bold text-indigo-600 ml-auto">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 mb-3">
            {appliedCoupon ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-green-800">🎟️ {appliedCoupon.code}</div>
                  <div className="text-xs text-green-600">
                    {appliedCoupon.discountType === "percent"
                      ? `${appliedCoupon.discountValue}% descuento`
                      : `$${appliedCoupon.discountValue} descuento`}
                  </div>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código de cupón"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700"
                >
                  Aplicar
                </button>
              </div>
            )}
            {couponError && (
              <div className="text-xs text-red-600 mt-1">{couponError}</div>
            )}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento:</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl pt-2 border-t mt-2">
              <span>TOTAL:</span>
              <span className="text-indigo-600">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">💰 Forma de pago</h4>
              <button
                onClick={handleAddPayment}
                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                + Dividir
              </button>
            </div>
            {payments.map((payment, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={payment.method}
                  onChange={(e) => handleUpdatePayment(index, "method", e.target.value)}
                  className="border rounded px-2 py-1.5 text-sm bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`$${total.toFixed(2)}`}
                  value={payment.amount}
                  onChange={(e) => handleUpdatePayment(index, "amount", e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                />
                {payments.length > 1 && (
                  <button
                    onClick={() => handleRemovePayment(index)}
                    className="text-red-500 text-sm px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t mt-2">
              <span>Total pagado:</span>
              <span className={`font-semibold ${isPaymentComplete ? "text-green-600" : "text-gray-600"}`}>
                ${totalPaid.toFixed(2)}
              </span>
            </div>
            {change > 0 && (
              <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                <span>Cambio:</span>
                <span className="font-bold text-green-700">${change.toFixed(2)}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleProcessSale}
            disabled={!isPaymentComplete || items.length === 0 || processing || !currentRegister}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-4 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {processing ? "⏳ Procesando..." : currentRegister ? `✅ Cobrar $${total.toFixed(2)}` : "🔒 Caja cerrada"}
          </button>
        </div>
      </div>
    </div>
  );
}