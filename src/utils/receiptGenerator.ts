import { PrintItem } from "../types";

/**
 * Formats a clean, structured text receipt suitable for WhatsApp and Email
 */
export function formatReceiptText(item: PrintItem): string {
  const dateFormatted = new Date(item.fecha || new Date()).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const divider = "━━━━━━━━━━━━━━━━━━━━━━━━";
  const lines: string[] = [
    `🧾 *COMPROBANTE DIGITAL*`,
    `Taller de Producción & Soluciones`,
    item.folio ? `Folio: *${item.folio}*` : "",
    `Fecha: ${dateFormatted}`,
    divider,
    `👤 *Cliente:* ${item.clienteNombre}`,
  ];

  if (item.empresaZona) {
    lines.push(`📍 *Zona / Empresa:* ${item.empresaZona}`);
  }
  if (item.clienteTelefono) {
    lines.push(`📞 *Tel:* ${item.clienteTelefono}`);
  }

  lines.push(divider);
  lines.push(`📋 *CONCEPTO / ARTÍCULOS:*`);
  lines.push(`*${item.titulo}*`);

  if (item.items && item.items.length > 0) {
    item.items.forEach((it) => {
      const cant = it.cantidad ? `${it.cantidad}x ` : "";
      const sub = it.subtotal ? ` - $${it.subtotal.toFixed(2)}` : "";
      lines.push(`• ${cant}${it.descripcion}${it.detalle ? ` (${it.detalle})` : ""}${sub}`);
    });
  }

  lines.push(divider);
  lines.push(`💰 *Total:* $${item.total.toFixed(2)}`);

  if (typeof item.anticipo === "number") {
    lines.push(`💵 *Anticipo / Pagado:* $${item.anticipo.toFixed(2)}`);
  }

  if (typeof item.saldo === "number") {
    const saldoTxt = item.saldo <= 0 ? "✅ *PAGADO AL 100%*" : `⚠️ *Saldo pendiente:* $${item.saldo.toFixed(2)}`;
    lines.push(saldoTxt);
  }

  if (item.metodoPago) {
    lines.push(`💳 *Método:* ${item.metodoPago}`);
  }

  if (item.fechaEntrega) {
    lines.push(`🗓️ *Entrega programada:* ${item.fechaEntrega}`);
  }

  if (item.notas) {
    lines.push(`📝 *Notas:* ${item.notas}`);
  }

  lines.push(divider);
  lines.push(`¡Gracias por su preferencia!`);
  lines.push(`_Task-OS • Sistema de Control Operativo_`);

  return lines.filter(Boolean).join("\n");
}

/**
 * Generates a high-resolution, beautiful thermal/digital receipt image (PNG) using HTML5 Canvas
 */
export async function generateReceiptPNG(item: PrintItem): Promise<string> {
  const canvas = document.createElement("canvas");
  const scale = 2; // Retina 2x scale for sharp text
  const width = 420;
  
  // Calculate dynamic height based on content
  const itemCount = item.items?.length || 1;
  const baseHeight = 560 + itemCount * 36;
  const height = baseHeight;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Top header banner
  ctx.fillStyle = "#1c1917"; // stone-900
  ctx.fillRect(0, 0, width, 90);

  // Header branding
  ctx.fillStyle = "#f59e0b"; // amber-500
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillText("TALLER DE PRODUCCIÓN & SERVICIOS", 24, 30);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("COMPROBANTE DIGITAL", 24, 54);

  ctx.font = "12px monospace";
  ctx.fillStyle = "#a8a29e";
  const dateStr = item.fecha || new Date().toISOString().slice(0, 10);
  ctx.fillText(`FOLIO: ${item.folio || "L-008"}  •  ${dateStr}`, 24, 74);

  // Client info card
  ctx.fillStyle = "#f5f5f4"; // stone-100
  ctx.beginPath();
  ctx.roundRect(20, 106, width - 40, 72, 8);
  ctx.fill();

  ctx.fillStyle = "#78716c";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText("CLIENTE / DESTINATARIO", 32, 126);

  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(item.clienteNombre || "Cliente General", 32, 146);

  ctx.fillStyle = "#57534e";
  ctx.font = "11px system-ui, sans-serif";
  const detailStr = [
    item.empresaZona ? `Zona: ${item.empresaZona}` : null,
    item.clienteTelefono ? `Tel: ${item.clienteTelefono}` : null,
  ]
    .filter(Boolean)
    .join("  |  ");
  ctx.fillText(detailStr || "Atención directa en taller", 32, 164);

  // Items / Concept section
  let currentY = 200;
  ctx.fillStyle = "#78716c";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText("DESGLOSE DE SERVICIO / ARTÍCULOS", 24, currentY);
  currentY += 16;

  // Horizontal dotted rule
  ctx.strokeStyle = "#e7e5e4";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(20, currentY);
  ctx.lineTo(width - 20, currentY);
  ctx.stroke();
  ctx.setLineDash([]);
  currentY += 18;

  // Title / main item
  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(item.titulo, 24, currentY);
  currentY += 18;

  if (item.items && item.items.length > 0) {
    item.items.forEach((it) => {
      ctx.fillStyle = "#292524";
      ctx.font = "12px system-ui, sans-serif";
      const desc = `${it.cantidad ? `${it.cantidad}x ` : ""}${it.descripcion}`;
      ctx.fillText(desc, 30, currentY);

      if (it.subtotal) {
        ctx.textAlign = "right";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`$${it.subtotal.toFixed(2)}`, width - 24, currentY);
        ctx.textAlign = "left";
      }
      currentY += 16;

      if (it.detalle) {
        ctx.fillStyle = "#78716c";
        ctx.font = "10px monospace";
        ctx.fillText(`  ${it.detalle}`, 30, currentY);
        currentY += 16;
      }
    });
  }

  currentY += 10;
  // Dotted line before financial block
  ctx.strokeStyle = "#e7e5e4";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(20, currentY);
  ctx.lineTo(width - 20, currentY);
  ctx.stroke();
  ctx.setLineDash([]);
  currentY += 22;

  // Financial summary box
  const total = item.total || 0;
  const anticipo = item.anticipo || 0;
  const saldo = typeof item.saldo === "number" ? item.saldo : Math.max(0, total - anticipo);

  const drawRow = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
    ctx.font = isBold ? "bold 13px system-ui, sans-serif" : "12px system-ui, sans-serif";
    ctx.fillStyle = isHighlight ? "#d97706" : "#44403c";
    ctx.fillText(label, 24, currentY);

    ctx.textAlign = "right";
    ctx.font = isBold ? "bold 14px monospace" : "12px monospace";
    ctx.fillStyle = isHighlight ? "#b45309" : "#1c1917";
    ctx.fillText(value, width - 24, currentY);
    ctx.textAlign = "left";
    currentY += 20;
  };

  drawRow("Precio Total:", `$${total.toFixed(2)}`, true);
  if (anticipo > 0) {
    drawRow("Anticipo abonado:", `$${anticipo.toFixed(2)}`);
  }

  // Saldo box
  currentY += 4;
  ctx.fillStyle = saldo <= 0 ? "#ecfdf5" : "#fffbeb";
  ctx.strokeStyle = saldo <= 0 ? "#10b981" : "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(20, currentY, width - 40, 38, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = saldo <= 0 ? "#065f46" : "#92400e";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(saldo <= 0 ? "ESTADO: TOTALMENTE PAGADO" : "SALDO POR COBRAR:", 34, currentY + 24);

  ctx.textAlign = "right";
  ctx.font = "bold 15px monospace";
  ctx.fillText(saldo <= 0 ? "$0.00" : `$${saldo.toFixed(2)}`, width - 34, currentY + 24);
  ctx.textAlign = "left";

  currentY += 56;

  // Delivery & Method info
  if (item.fechaEntrega || item.metodoPago) {
    ctx.fillStyle = "#78716c";
    ctx.font = "11px system-ui, sans-serif";
    const extraInfo = [
      item.fechaEntrega ? `Entrega: ${item.fechaEntrega}` : null,
      item.metodoPago ? `Método: ${item.metodoPago}` : null,
    ]
      .filter(Boolean)
      .join("  •  ");
    ctx.fillText(extraInfo, 24, currentY);
    currentY += 20;
  }

  // Footer bar
  ctx.fillStyle = "#f5f5f4";
  ctx.fillRect(0, height - 42, width, 42);

  ctx.fillStyle = "#a8a29e";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("TASK-OS • COMPROBANTE DE CONTROL OPERATIVO", width / 2, height - 20);

  return canvas.toDataURL("image/png");
}

/**
 * Direct file download helper for PNG
 */
export async function downloadReceiptPNG(item: PrintItem, filename?: string): Promise<void> {
  const dataUrl = await generateReceiptPNG(item);
  const link = document.createElement("a");
  const name = filename || `Comprobante-${item.folio || "Ticket"}-${Date.now()}.png`;
  link.download = name;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
