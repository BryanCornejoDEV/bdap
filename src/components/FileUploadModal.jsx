import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Modal from "./Modal";
import { IconUpload, IconFileSpreadsheet, IconAlertTriangle } from "./icons";
import { importReportFile, clearReportRows } from "../services/reports";
import { exportToCSV } from "../utils/export";

const num = new Intl.NumberFormat("es");

export default function FileUploadModal({
  isOpen,
  onClose,
  reportId,
  reportName,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [headers, setHeaders] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setPreviewRows([]);
    setTotalRows(0);
    setHeaders([]);
    setError("");
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (selectedFile) => {
    setError("");
    if (!selectedFile) return;

    const validExtensions = [".csv", ".xlsx", ".xls", ".txt"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError("Formato no soportado. Por favor sube un archivo .csv, .xlsx o .xls");
      return;
    }

    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!json || json.length === 0) {
        setError("El archivo seleccionado está vacío.");
        return;
      }

      setTotalRows(json.length);
      setHeaders(Object.keys(json[0] || {}));
      setPreviewRows(json.slice(0, 5));
    } catch (err) {
      setError("No se pudo leer la previsualización del archivo: " + err.message);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const downloadTemplate = () => {
    const sample = [
      { Mes: "Ene", Ingresos: 12500, Órdenes: 140 },
      { Mes: "Feb", Ingresos: 14200, Órdenes: 165 },
      { Mes: "Mar", Ingresos: 16800, Órdenes: 190 },
      { Mes: "Abr", Ingresos: 15400, Órdenes: 172 },
    ];
    exportToCSV({ filename: "plantilla_metricas_bdap.csv", rows: sample });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Por favor selecciona un archivo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (replaceExisting) {
        await clearReportRows(reportId);
      }

      const res = await importReportFile(reportId, file);
      handleModalClose();
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.details?.join(", ") ||
        "Error al procesar el archivo en el servidor";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Cargar archivo a "${reportName}"`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragOver ? "border-accent bg-accent/5 scale-[1.01]" : "border-border hover:border-accent"
          }`}
          style={{ background: isDragOver ? "var(--accent-soft)" : "var(--surface-2)" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-xl grid place-items-center text-accent"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <IconUpload size={24} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {file ? file.name : "Haz clic para subir o arrastra tu archivo aquí"}
              </p>
              <p className="text-xs text-muted mt-1">
                Admite archivos CSV, Excel (.xlsx, .xls) hasta 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Plantilla de ayuda */}
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span>Columnas sugeridas: <strong>Mes</strong>, <strong>Ingresos</strong>, <strong>Órdenes</strong></span>
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-accent hover:underline flex items-center gap-1 font-medium"
          >
            <IconFileSpreadsheet size={13} />
            Descargar plantilla de ejemplo
          </button>
        </div>

        {/* Previsualización si hay archivo cargado */}
        {previewRows.length > 0 && (
          <div className="card p-4 space-y-3" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Previsualización ({totalRows} filas detectadas)
              </span>
              <span className="chip chip-sm">Primeras {previewRows.length} filas</span>
            </div>

            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
              <table className="table text-xs">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="py-2 px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="py-2 px-3">
                          {typeof r[h] === "number" ? num.format(r[h]) : String(r[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Opciones */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="replace"
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          <label htmlFor="replace" className="text-xs text-muted cursor-pointer select-none">
            Reemplazar registros existentes (borrar los anteriores antes de importar)
          </label>
        </div>

        {error && (
          <div
            className="text-sm rounded-lg p-3 flex items-start gap-2"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            role="alert"
          >
            <IconAlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end items-center gap-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={loading}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!file || loading}
            className="btn btn-primary"
          >
            <IconUpload size={16} />
            {loading ? "Procesando…" : "Importar registros"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
