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

  const [activeServices, setActiveServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Items del ticket
  const [items, setItems] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // Cupón
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  // Pagos
  const [payments, setPayments] = useState([{ method: "efectivo", amount: "" }]);

  // Estado
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastTransaction, setLastTransaction] = useState(null);

  // Cargar servicios activos
  useEffect(() => {
    const q = query(
      collection(db, "services"),
      where("branchId", "==", branchId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((s) => s.status !== "completado");
      setActiveServices(data);
    });

    return unsubscribe;
  }, [branchId]);

  // Cargar productos
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("branchId", "==", branchId)
    );

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

  // Cálculos
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

  // Agregar servicio
  const handleAddService = (service) => {
    if (selectedServiceIds.includes(service.id)) return;
    
    setItems([...items, {
      type: "service",
      id: service.id,
      serviceId: service.id,
      name: `${service.petName} - ${service.serviceType === "bano" ? "Baño" : service.serviceType === "corte" ? "Corte" : "Baño + Corte"}`,
      quantity: 1,
      unitPrice: 0, // precio variable
      total: 0,
      editable: true
    }]);
    setSelectedServiceIds([...selectedServiceIds, service.id]);
  };

  // Agregar producto
  const handleAddProduct = (product) => {
    const existing = items.find((i) => i.type === "product" && i.id === product.id);
    
    if (existing) {
      if (existing.quantity + 1 > product.stock) {
        setMessage("❌ Stock insuficiente");
        setTimeout(() => setMessage(""), 2000);
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
  };

  // Actualizar precio de servicio
  const handleUpdateServicePrice = (index, price) => {
    const newItems = [...items];
    newItems[index].unitPrice = parseFloat(price) || 0;
    newItems[index].total = newItems[index].unitPrice * newItems[index].quantity;
    setItems(newItems);
  };

  // Actualizar cantidad
  const handleUpdateQuantity = (index, quantity) => {
    const newItems = [...items];
    const qty = parseInt(quantity) || 1;
    const max = newItems[index].maxStock || 999;
    newItems[index].quantity = Math.min(qty, max);
    newItems[index].total = newItems[index].unitPrice * newItems[index].quantity;
    setItems(newItems);
  };

  // Eliminar item
  const handleRemoveItem = (index) => {
    const item = items[index];
    if (item.type === "service") {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== item.serviceId));
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Aplicar cupón
  const handleApplyCoupon = async () => {
    setCouponError("");
    setAppliedCoupon(null);

    if (!couponCode.trim()) return;

    try {
      const q = query(
        collection(db, "coupons"),
        where("code", "==", couponCode.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setCouponError("❌ Cupón no encontrado");
        return;
      }

      const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

      if (coupon.used) {
        setCouponError("❌ Este cupón ya fue usado");
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

  // Remover cupón
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Agregar método de pago
  const handleAddPayment = () => {
    setPayments([...payments, { method: "efectivo", amount: "" }]);
  };

  // Actualizar pago
  const handleUpdatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  // Remover pago
  const handleRemovePayment = (index) => {
    if (payments.length === 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Procesar venta
  const handleProcessSale = async () => {
    if (!isPaymentComplete) {
      setMessage("❌ El pago está incompleto");
      return;
    }

    if (items.length === 0) {
      setMessage("❌ No hay items en el ticket");
      return;
    }

    setProcessing(true);
    setMessage("");

    try {
      // Obtener datos del cliente (del primer servicio o producto)
      const firstService = items.find((i) => i.type === "service");
      const serviceData = firstService 
        ? activeServices.find((s) => s.id === firstService.serviceId)
        : null;

      // Crear transacción
      const transactionData = {
        branchId,
        userId: currentUser?.uid,
        userName: userData?.email || "Desconocido",
        items: items.map((i) => ({
          type: i.type,
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total
        })),
        subtotal,
        discount,
        discountReason: appliedCoupon 
          ? `Cupón: ${appliedCoupon.code}` 
          : null,
        total,
        payments: payments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0
        })),
        change,
        couponId: appliedCoupon?.id || null,
        couponCode: appliedCoupon?.code || null,
        ownerId: serviceData?.ownerId || null,
        ownerName: serviceData?.ownerName || null,
        ownerPhone: serviceData?.ownerPhone || null,
        petId: serviceData?.petId || null,
        petName: serviceData?.petName || null,
        serviceIds: items.filter((i) => i.type === "service").map((i) => i.serviceId),
        status: "completado",
        timestamp: serverTimestamp()
      };

      const txRef = await addDoc(collection(db, "transactions"), transactionData);
      const transaction = { id: txRef.id, ...transactionData, timestamp: new Date() };

      // Marcar cupón como usado
      if (appliedCoupon) {
        await updateDoc(doc(db, "coupons", appliedCoupon.id), {
          used: true,
          usedAt: serverTimestamp(),
          transactionId: txRef.id
        });
      }

      // Descontar stock de productos
      for (const item of items) {
        if (item.type === "product") {
          const productRef = doc(db, "products", item.productId);
          await updateDoc(productRef, {
            stock: item.maxStock - item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }

      // Marcar servicios como completados
      for (const item of items) {
        if (item.type === "service") {
          await updateDoc(doc(db, "services", item.serviceId), {
            status: "completado",
            endTime: serverTimestamp(),
            totalCost: item.total,
            paymentMethod: payments[0]?.method || "efectivo"
          });
        }
      }

      setLastTransaction(transaction);
      setMessage("✅ Venta procesada correctamente");

      // Generar PDF
      generateTicketPDF(transaction);

      // Limpiar
      setItems([]);
      setSelectedServiceIds([]);
      setAppliedCoupon(null);
      setCouponCode("");
      setPayments([{ method: "efectivo", amount: "" }]);
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
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Columna izquierda: Agregar items */}
        <div className="space-y-4">
          {/* Servicios activos */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">🐾 Servicios activos</h3>
            {activeServices.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-3">
                No hay servicios activos
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleAddService(service)}
                    disabled={selectedServiceIds.includes(service.id)}
                    className="w-full text-left border rounded-md p-2 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">🐕 {service.petName}</div>
                        <div className="text-xs text-gray-500">
                          {service.serviceType === "bano" ? "Baño" : service.serviceType === "corte" ? "Corte" : "Baño + Corte"}
                          {" · "}
                          {service.ownerName}
                        </div>
                      </div>
                      {selectedServiceIds.includes(service.id) && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Agregado</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">🛍️ Productos</h3>
            {products.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-3">
                No hay productos disponibles
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="w-full text-left border rounded-md p-2 hover:bg-indigo-50 text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">
                          Stock: {product.stock} {product.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${product.price}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Ticket */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">🧾 Ticket</h3>

          {items.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              Agrega servicios o productos al ticket
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-md p-2">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.type === "service" ? "Servicio" : "Producto"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 text-xs hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    {item.editable ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={item.unitPrice || ""}
                        onChange={(e) => handleUpdateServicePrice(index, e.target.value)}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <div className="text-xs text-gray-500">${item.unitPrice} c/u</div>
                    )}
                    
                    {!item.editable && (
                      <input
                        type="number"
                        min="1"
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                        className="w-16 border rounded px-2 py-1 text-sm text-center"
                      />
                    )}

                    <div className="text-sm font-semibold w-20 text-right">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cupón */}
          <div className="border-t pt-3 mb-3">
            {appliedCoupon ? (
              <div className="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-green-800">
                    🎟️ {appliedCoupon.code}
                  </div>
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

          {/* Totales */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento:</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>TOTAL:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Pagos */}
          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">💰 Pagos</h4>
              <button
                onClick={handleAddPayment}
                className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                + Agregar
              </button>
            </div>

            {payments.map((payment, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={payment.method}
                  onChange={(e) => handleUpdatePayment(index, "method", e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  value={payment.amount}
                  onChange={(e) => handleUpdatePayment(index, "amount", e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                />
                {payments.length > 1 && (
                  <button
                    onClick={() => handleRemovePayment(index)}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Total pagado:</span>
              <span className={isPaymentComplete ? "text-green-600 font-semibold" : "text-red-600"}>
                ${totalPaid.toFixed(2)}
              </span>
            </div>

            {change > 0 && (
              <div className="flex justify-between text-sm">
                <span>Cambio:</span>
                <span className="font-semibold">${change.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Botón procesar */}
          <button
            onClick={handleProcessSale}
            disabled={!isPaymentComplete || items.length === 0 || processing}
            className="w-full bg-green-600 text-white py-3 rounded-md font-medium mt-4 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Procesando..." : `✅ Cobrar $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
                      }
