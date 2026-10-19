import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { jwtDecode } from "jwt-decode";

const moneyFmt = new Intl.NumberFormat("es", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const numFmt = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });

// Extrae información del usuario/organización desde el JWT activo si no se provee explícitamente
function getActiveSessionMeta() {
  try {
    const token = localStorage.getItem("bdap_token");
    if (!token) return { email: "ejecutivo@bdap.local", role: "analyst", orgId: 1 };
    const decoded = jwtDecode(token);
    return {
      email: decoded?.email || "ejecutivo@bdap.local",
      name: decoded?.name || decoded?.email?.split("@")[0] || "Ejecutivo BDAP",
      role: decoded?.role || "analyst",
      orgId: decoded?.orgId || 1,
    };
  } catch {
    return { email: "ejecutivo@bdap.local", name: "Ejecutivo BDAP", role: "analyst", orgId: 1 };
  }
}

function cleanHeaderLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isCurrencyColumn(headerKey) {
  const k = String(headerKey).toLowerCase();
  return (
    k.includes("ingreso") ||
    k.includes("revenue") ||
    k.includes("gasto") ||
    k.includes("costo") ||
    k.includes("utilidad") ||
    k.includes("profit") ||
    k.includes("proyección") ||
    k.includes("proyeccion") ||
    k.includes("banda") ||
    k.includes("ticket") ||
    k.includes("monto") ||
    k.includes(" ($)")
  );
}

function isNumericColumn(headerKey, rows) {
  if (isCurrencyColumn(headerKey)) return true;
  const k = String(headerKey).toLowerCase();
  if (
    k.includes("órdenes") ||
    k.includes("ordenes") ||
    k.includes("clientes") ||
    k.includes("horas") ||
    k.includes("actual") ||
    k.includes("objetivo") ||
    k.includes("avance") ||
    k.includes("margen")
  ) {
    return true;
  }
  const sample = rows.find((r) => r[headerKey] !== null && r[headerKey] !== undefined && r[headerKey] !== "—");
  return sample ? typeof sample[headerKey] === "number" : false;
}

function formatCellValue(val, headerKey) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "number") {
    if (isCurrencyColumn(headerKey)) return moneyFmt.format(val);
    return numFmt.format(val);
  }
  return String(val);
}

// Genera KPIs ejecutivos automáticos si la página no pasa summaryKpis explícitos
function buildAutoKpis(rows, headers) {
  if (!rows || !rows.length) return [];
  const kpis = [];

  const sumCol = (col) =>
    rows.reduce((acc, r) => acc + (typeof r[col] === "number" ? r[col] : 0), 0);

  const revCol = headers.find((h) => /ingreso|revenue/i.test(h));
  const expCol = headers.find((h) => /gasto|costo|expense/i.test(h));
  const profCol = headers.find((h) => /utilidad|profit/i.test(h));
  const ordCol = headers.find((h) => /órdenes|ordenes|orders/i.test(h));

  if (revCol && rows.some((r) => typeof r[revCol] === "number")) {
    const totalRev = sumCol(revCol);
    kpis.push({
      label: "INGRESOS ACUMULADOS",
      value: moneyFmt.format(totalRev),
      sub: `${rows.length} registros analizados`,
      tone: "accent",
    });

    if (profCol && rows.some((r) => typeof r[profCol] === "number")) {
      const totalProf = sumCol(profCol);
      const margin = totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) : "0.0";
      kpis.push({
        label: "UTILIDAD NETA TOTAL",
        value: moneyFmt.format(totalProf),
        sub: `Margen operativo: ${margin}%`,
        tone: "success",
      });
    } else if (expCol && rows.some((r) => typeof r[expCol] === "number")) {
      const totalExp = sumCol(expCol);
      kpis.push({
        label: "GASTOS OPERATIVOS",
        value: moneyFmt.format(totalExp),
        sub: "Estructura de costos",
        tone: "neutral",
      });
    }
  }

  if (ordCol && rows.some((r) => typeof r[ordCol] === "number")) {
    const totalOrd = sumCol(ordCol);
    kpis.push({
      label: "VOLUMEN DE ÓRDENES",
      value: numFmt.format(totalOrd),
      sub: `Promedio: ${numFmt.format(Math.round(totalOrd / rows.length))} / periodo`,
      tone: "accent",
    });
  }

  if (kpis.length < 4) {
    kpis.push({
      label: "TOTAL DE REGISTROS",
      value: `${rows.length} filas`,
      sub: `${headers.length} dimensiones de datos`,
      tone: "neutral",
    });
  }

  return kpis.slice(0, 4);
}

/**
 * Genera y descarga un documento PDF corporativo de alta factura visual.
 * Compatible con llamadas simples `{ title, rows }` o enriquecidas con metadatos ejecutivos.
 */
export function exportToPDF({
  title = "Reporte Ejecutivo",
  subtitle = "",
  category = "INFORME CORPORATIVO",
  orgName = "",
  summaryKpis = null,
  notes = null,
  rows = [],
  orientation = null,
}) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const autoOrientation = orientation || (headers.length >= 6 ? "landscape" : "portrait");

  const doc = new jsPDF({
    orientation: autoOrientation,
    unit: "mm",
    format: "a4",
  });

  const session = getActiveSessionMeta();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date();
  const dateStr = now.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const docFolio = `BDAP-${now.getFullYear()}-${String(
    (now.getHours() * 60 + now.getMinutes()) * 10 + (rows.length % 10)
  ).padStart(4, "0")}`;

  doc.setProperties({
    title: `${title} - BDAP Enterprise`,
    subject: subtitle || "Reporte Ejecutivo de Analítica y Operaciones",
    author: session.name || session.email,
    creator: "BDAP v2.0 Enterprise (Argon Engine)",
  });

  // =========================================================================
  // 1. BANNER CORPORATIVO SUPERIOR (PÁGINA 1)
  // =========================================================================
  // Fondo oscuro corporativo (#0F172A)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Franja superior de acento (#2A78D6)
  doc.setFillColor(42, 120, 214);
  doc.rect(0, 0, pageWidth, 2.2, "F");

  // Isotipo BDAP vectorial (caja azul + 3 barras ascendentes blancas)
  doc.setFillColor(42, 120, 214);
  doc.roundedRect(margin, 8.5, 11, 11, 2, 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 2.2, 14.5, 1.6, 3.2, "F");
  doc.rect(margin + 4.7, 12.2, 1.6, 5.5, "F");
  doc.rect(margin + 7.2, 10.2, 1.6, 7.5, "F");

  // Nombre de la plataforma
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("BDAP ENTERPRISE", margin + 14.5, 13.8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text("Business Data & Workplace Intelligence Platform · v2.0 Argon", margin + 14.5, 18.5);

  // Metadatos alineados a la derecha en el banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `FOLIO: ${docFolio}   |   ${dateStr.toUpperCase()} · ${timeStr}`,
    pageWidth - margin,
    12.5,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const tenantLabel = orgName ? `ORGANIZACIÓN: ${orgName.toUpperCase()}` : `TENANT ID #${session.orgId}`;
  doc.text(
    `${tenantLabel}   |   CLASIFICACIÓN: EJECUTIVO CONFIDENCIAL`,
    pageWidth - margin,
    18,
    { align: "right" }
  );

  // Línea sutil divisoria inferior en el header
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(margin, 24, pageWidth - margin, 24);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido por: ${session.name} (${session.email})`, margin, 28.5);
  doc.text(category.toUpperCase(), pageWidth - margin, 28.5, { align: "right" });

  // =========================================================================
  // 2. BLOQUE DE TÍTULO Y CONTEXTO DEL DOCUMENTO
  // =========================================================================
  let cursorY = 41;

  // Barra vertical de acento junto al título
  doc.setFillColor(42, 120, 214);
  doc.roundedRect(margin, cursorY - 5, 2.2, subtitle ? 13 : 8.5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(title), margin + 5.5, cursorY);

  if (subtitle) {
    cursorY += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 84, 103);
    doc.text(String(subtitle), margin + 5.5, cursorY);
  } else {
    cursorY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(102, 112, 133);
    doc.text(
      `Informe estructurado con ${rows.length} registros verificados y métricas consolidadas.`,
      margin + 5.5,
      cursorY
    );
  }

  cursorY += 7;

  // =========================================================================
  // 3. TARJETAS EJECUTIVAS DE RESUMEN (KPI CARDS)
  // =========================================================================
  const kpiList =
    Array.isArray(summaryKpis) && summaryKpis.length > 0
      ? summaryKpis.slice(0, 4)
      : buildAutoKpis(rows, headers);

  if (kpiList.length > 0) {
    const gap = 3.5;
    const cardCount = kpiList.length;
    const cardWidth = (contentWidth - gap * (cardCount - 1)) / cardCount;
    const cardHeight = 20;

    kpiList.forEach((kpi, idx) => {
      const x = margin + idx * (cardWidth + gap);
      const y = cursorY;

      // Fondo tarjeta (#F8FAFC) y borde (#E2E8F0)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.35);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

      // Acento superior de la tarjeta según el tono
      if (kpi.tone === "success") doc.setFillColor(10, 125, 51);
      else if (kpi.tone === "warning") doc.setFillColor(217, 119, 6);
      else if (kpi.tone === "danger") doc.setFillColor(208, 59, 59);
      else doc.setFillColor(42, 120, 214);
      doc.rect(x + 2, y, cardWidth - 4, 1.2, "F");

      // Label del KPI
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(String(kpi.label || "").toUpperCase(), x + 4, y + 6.2);

      // Valor principal
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      if (kpi.tone === "success") doc.setTextColor(10, 125, 51);
      else if (kpi.tone === "danger") doc.setTextColor(208, 59, 59);
      else doc.setTextColor(15, 23, 42);
      doc.text(String(kpi.value ?? "—"), x + 4, y + 13);

      // Subtítulo / Hint
      if (kpi.sub) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(115, 128, 148);
        doc.text(String(kpi.sub), x + 4, y + 17.5);
      }
    });

    cursorY += cardHeight + 6;
  }

  // =========================================================================
  // 4. TABLA DE DATOS PROFESIONAL (AUTOTABLE)
  // =========================================================================
  if (rows.length > 0) {
    const cleanHeaders = headers.map(cleanHeaderLabel);
    const body = rows.map((r) => headers.map((h) => formatCellValue(r[h], h)));

    // Calcular fila de totales si existen columnas numéricas sumables
    const hasSummableCols = headers.some(
      (h, i) =>
        i > 0 &&
        rows.some((r) => typeof r[h] === "number") &&
        !/margen|avance|%|zscore|id/i.test(h)
    );

    let foot = undefined;
    if (hasSummableCols && rows.length > 1) {
      const footRow = headers.map((h, idx) => {
        if (idx === 0) return "TOTAL / CONSOLIDADO";
        if (/margen|avance|%/i.test(h)) return "";
        const numericVals = rows.map((r) => r[h]).filter((v) => typeof v === "number");
        if (!numericVals.length) return "";
        const sum = numericVals.reduce((a, b) => a + b, 0);
        return formatCellValue(sum, h);
      });
      foot = [footRow];
    }

    // Construir estilos por columna (alineación derecha en números/moneda)
    const columnStyles = {};
    headers.forEach((h, idx) => {
      if (idx === 0) {
        columnStyles[idx] = { fontStyle: "bold", textColor: [15, 23, 42] };
      } else if (isNumericColumn(h, rows)) {
        columnStyles[idx] = { halign: "right" };
      }
    });

    autoTable(doc, {
      startY: cursorY,
      head: [cleanHeaders],
      body,
      foot,
      margin: { left: margin, right: margin, bottom: 20 },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 3.2, right: 3.5, bottom: 3.2, left: 3.5 },
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.25,
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 41, 59], // #1E293B
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.8,
        cellPadding: { top: 3.8, right: 3.5, bottom: 3.8, left: 3.5 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // #F8FAFC
      },
      footStyles: {
        fillColor: [234, 242, 252], // #EAF2FC
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8.5,
        lineColor: [186, 212, 245],
        lineWidth: 0.35,
      },
      columnStyles,
      didParseCell: (data) => {
        // Alinear encabezados y pie de tabla igual que las columnas numéricas
        if ((data.section === "head" || data.section === "foot") && data.column.index > 0) {
          const hKey = headers[data.column.index];
          if (isNumericColumn(hKey, rows)) {
            data.cell.styles.halign = "right";
          }
        }

        // Coloreado semántico inteligente en celdas del cuerpo
        if (data.section === "body") {
          const rawText = String(data.cell.raw || "").toLowerCase();
          if (
            rawText === "completado" ||
            rawText === "en tiempo" ||
            rawText === "listo" ||
            rawText.startsWith("+$")
          ) {
            data.cell.styles.textColor = [10, 125, 51];
            data.cell.styles.fontStyle = "bold";
          } else if (
            rawText === "en riesgo" ||
            rawText === "en revisión / qa" ||
            rawText === "alta"
          ) {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = "bold";
          } else if (
            rawText === "retrasado" ||
            rawText === "urgente" ||
            rawText === "crítica" ||
            rawText.startsWith("-$")
          ) {
            data.cell.styles.textColor = [208, 59, 59];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 7;
  } else {
    // Estado vacío estilizado si el reporte no tiene filas
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, contentWidth, 22, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "No se encontraron registros tabulares para mostrar en este corte.",
      pageWidth / 2,
      cursorY + 12,
      { align: "center" }
    );
    cursorY += 28;
  }

  // =========================================================================
  // 5. BLOQUE DE NOTAS / OBSERVACIONES EJECUTIVAS (SI EXISTEN)
  // =========================================================================
  const noteItems = Array.isArray(notes)
    ? notes.filter(Boolean)
    : typeof notes === "string" && notes.trim()
    ? [notes.trim()]
    : [];

  if (noteItems.length > 0) {
    const boxHeight = 10 + noteItems.length * 5.5;
    if (cursorY + boxHeight > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFillColor(245, 248, 255);
    doc.setDrawColor(200, 218, 245);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(28, 92, 171);
    doc.text("NOTAS Y CONCLUSIONES EJECUTIVAS", margin + 4, cursorY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    noteItems.forEach((line, i) => {
      const cleanLine = String(line).slice(0, 145);
      doc.text(`•  ${cleanLine}`, margin + 4, cursorY + 11 + i * 5.2);
    });
  }

  // =========================================================================
  // 6. PIE DE PÁGINA CORPORATIVO Y NUMERACIÓN EN TODAS LAS PÁGINAS
  // =========================================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Si hay páginas subsecuentes, agregar mini-encabezado de continuación
    if (p > 1) {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`BDAP ENTERPRISE  ·  ${String(title).toUpperCase()}`, margin, 5.2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Folio: ${docFolio}`, pageWidth - margin, 5.2, { align: "right" });
    }

    const footerY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(102, 112, 133);
    doc.text(
      "BDAP v2.0 Enterprise · Documento generado con aislamiento Multi-Tenant verificado",
      margin,
      footerY
    );

    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
  }

  const safeTitle = String(title || "Reporte")
    .trim()
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "_");
  const dateSuffix = now.toISOString().slice(0, 10);
  doc.save(`${safeTitle}_${dateSuffix}.pdf`);
}

export function exportToExcel({ sheetName = "Data", rows = [] }) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${sheetName}.xlsx`);
}

export function exportToCSV({ filename = "data.csv", rows = [] }) {
  if (!rows.length) {
    saveAs(new Blob([""], { type: "text/csv;charset=utf-8;" }), filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escapeCsv = (val) => {
    if (val == null) return "";
    const s = String(val).replace(/"/g, '""');
    if (s.search(/[",\n;]/g) >= 0) return '"' + s + '"';
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
}