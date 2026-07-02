import { jsPDF } from "jspdf";

const BRANCHES = {
  "sucursal-11av": { name: "SimiDog 11av", address: "11 Avenida" },
  "sucursal-65av": { name: "SimiDog 65av", address: "65 Avenida" }
};

export function generateTicketPDF(transaction) {
  const doc = new jsPDF();
  const branch = BRANCHES[transaction.branchId] || { name: "SimiDog", address: "" };
  const date = transaction.timestamp?.toDate 
    ? transaction.timestamp.toDate() 
    : new Date(transaction.timestamp);

  let y = 15;

  // Encabezado
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(branch.name, 105, y, { align: "center" });
  y += 6;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(branch.address, 105, y, { align: "center" });
  y += 5;
  doc.text("Tel: (000) 000-0000", 105, y, { align: "center" });
  y += 8;

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 6;

  // Info del ticket
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TICKET DE VENTA", 20, y);
  doc.text(`Folio: #${transaction.id.slice(-6).toUpperCase()}`, 190, y, { align: "right" });
  y += 5;
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${date.toLocaleDateString("es-ES")}`, 20, y);
  doc.text(`Hora: ${date.toLocaleTimeString("es-ES")}`, 190, y, { align: "right" });
  y += 5;
  doc.text(`Atendió: ${transaction.userName || "N/A"}`, 20, y);
  y += 8;

  // Datos del cliente
  if (transaction.ownerName) {
    doc.setLineWidth(0.2);
    doc.line(20, y, 190, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${transaction.ownerName}`, 20, y);
    y += 5;
    if (transaction.ownerPhone) {
      doc.text(`Teléfono: ${transaction.ownerPhone}`, 20, y);
      y += 5;
    }
    if (transaction.petName) {
      doc.text(`Mascota: ${transaction.petName}`, 20, y);
      y += 5;
    }
    y += 3;
  }

  // Tabla de items
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 5;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONCEPTO", 20, y);
  doc.text("CANT", 120, y, { align: "center" });
  doc.text("P.UNIT", 150, y, { align: "right" });
  doc.text("TOTAL", 190, y, { align: "right" });
  y += 3;
  doc.setLineWidth(0.2);
  doc.line(20, y, 190, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  transaction.items.forEach((item) => {
    const name = item.name.length > 30 ? item.name.substring(0, 30) + "..." : item.name;
    doc.text(name, 20, y);
    doc.text(String(item.quantity), 120, y, { align: "center" });
    doc.text(`$${item.unitPrice.toFixed(2)}`, 150, y, { align: "right" });
    doc.text(`$${item.total.toFixed(2)}`, 190, y, { align: "right" });
    y += 5;
    
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  y += 3;
  doc.setLineWidth(0.2);
  doc.line(20, y, 190, y);
  y += 6;

  // Totales
  doc.setFontSize(10);
  doc.text("Subtotal:", 130, y);
  doc.text(`$${transaction.subtotal.toFixed(2)}`, 190, y, { align: "right" });
  y += 5;

  if (transaction.discount > 0) {
    doc.setTextColor(220, 50, 50);
    doc.text(`Descuento (${transaction.discountReason || ""}):`, 130, y);
    doc.text(`-$${transaction.discount.toFixed(2)}`, 190, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", 130, y);
  doc.text(`$${transaction.total.toFixed(2)}`, 190, y, { align: "right" });
  y += 8;

  // Métodos de pago
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAGOS:", 20, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  
  transaction.payments.forEach((p) => {
    const methodLabel = {
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia"
    }[p.method] || p.method;
    doc.text(`  ${methodLabel}:`, 25, y);
    doc.text(`$${p.amount.toFixed(2)}`, 190, y, { align: "right" });
    y += 5;
  });

  if (transaction.change > 0) {
    doc.text("  Cambio:", 25, y);
    doc.text(`$${transaction.change.toFixed(2)}`, 190, y, { align: "right" });
    y += 5;
  }

  y += 8;
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 8;

  // Mensaje final
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por su preferencia!", 105, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.text("🐾 SimiDog - Cuidamos a tu mejor amigo", 105, y, { align: "center" });

  // Guardar
  const filename = `ticket-${transaction.id.slice(-6)}-${date.toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
